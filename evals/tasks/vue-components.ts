import { readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { defineTask, equal, observedRead, type Transcript } from '@pstack/agent-eval'
import { checkVueComponents } from '../checks/vue-components.js'

export const principle = readFileSync(new URL('../../skills/principle-compose-vue-components/SKILL.md', import.meta.url), 'utf8')
const checkerHash = createHash('sha256').update(readFileSync(new URL('../checks/vue-components.ts', import.meta.url))).digest('hex')
const toolchainHash = createHash('sha256').update(readFileSync(new URL('../../pnpm-lock.yaml', import.meta.url))).digest('hex')
export const scenarios = ['dialogs', 'avatar', 'task-list'] as const
export type Scenario = typeof scenarios[number]
export type Condition = 'without' | 'with'

const guide = `# Workspace guide

Use Vue 3.5 with Composition API and TypeScript in script setup. Keep strict types,
including noUncheckedIndexedAccess, exactOptionalPropertyTypes, and strictTemplates.
The host supplies Vue, Vite, and TypeScript. Write application source under src.
Do not install packages or add dependencies. Use Vue and browser APIs.
Keep src/main.ts as the entrypoint mounting App.vue on #app.
Work locally and finish with a brief description of your changes.
`

export const requests: Record<Scenario, string> = {
  dialogs: `Read guide.md and build a document workspace in App.vue.
Show three buttons: Delete document, Edit profile, and Share document.
Each opens an accessible dialog with the matching title. Escape closes every dialog.
Make the workspace fully usable with a keyboard. Keep focus inside an open modal and return it to the opening control when closed.
The delete dialog has explanatory text and Cancel and Confirm delete actions in a footer.
Cancel leaves the document alone. Confirm delete closes it and displays Document deleted on the page.
The edit dialog contains a Name field initially set to Alex and a Save name action.
Name is required. An empty submission stays open and shows Name is required, associated with the invalid field for assistive technology.
Saving closes it and displays Name: followed by the saved value on the page.
Reopening shows the saved name. Escape discards unsaved name changes.
The share dialog has an Email field and an Invite action beside the field, with no footer.
Inviting closes it and displays Invited: followed by the email on the page.
All dialogs can be reopened. Keep each form's state independent.
Implement the complete UI, including modest styling.`,
  avatar: `Read guide.md and add a UserAvatar component to this app.
It takes a person's name and displays their uppercase initials, exposed as an image with the person's accessible name.
Render examples for Alex Opalic and Mina Chen in App.vue, showing AO and MC.
Add a Switch person button that changes Alex Opalic to Sam Rivera and updates the initials to SR.
Give the avatars a circular background and keep the component reusable.`,
  'task-list': `Read guide.md and build a task workspace in App.vue.
Start with three incomplete tasks: Write release notes, Review pull request, and Update dependencies.
Each row shows a labeled checkbox that toggles that task's completion independently.
Provide a Query field and Search and Clear search actions. Search filters task titles case-insensitively by the submitted query.
Clear search empties the query and restores the full list. Typing alone should not filter until Search is activated.
Support keyboard operation, visible focus, and accessible names throughout.
Use reusable app-styled button and text-field components across the task workspace.
Keep the task list and its row in separate components. The row belongs only to this task list.
Keep the search controls together in a component, with its run and clear actions in separate child components.
Use those shared button and text-field components in a small workspace-name form too, with a Workspace name field and Save workspace name action.
The initial workspace name is Team tasks. Saving changes the page heading to the entered name.
Choose clear component names and give the page modest styling.`,
}

export function vueFiles(condition: Condition) {
  return {
    'guide.md': guide + (condition === 'with' ? `\n${principle.replace(/^---\n[\s\S]*?\n---\n/, '')}` : ''),
    'src/main.ts': "import { createApp } from 'vue'\nimport App from './App.vue'\ncreateApp(App).mount('#app')\n",
    'src/App.vue': '<script setup lang="ts">\n</script>\n<template><main><h1>Document workspace</h1></main></template>\n',
  }
}

export async function sourceFiles(project: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`Unexpected source symlink: ${path}`)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile()) files[relative(project, path)] = await readFile(path, 'utf8')
    }
  }
  await walk(join(project, 'src'))
  return files
}

export function guideExposure(transcript: Transcript, expectedGuide: string) {
  const root = transcript.threads.find(thread => thread.id === transcript.rootId)
  const returnedGuide = root?.commands.some(command => command.command.includes('guide.md')
    && command.output?.includes(expectedGuide.trim()))
  return returnedGuide ? equal('Root command returned the complete workspace guide', returnedGuide, true)
    : observedRead('Read the workspace guide', transcript, '/guide.md', 'root')
}

export function vueTask(scenario: Scenario, condition: Condition, repetition: number) {
  return defineTask({
    id: scenario,
    description: 'Vue component behavior and source capture',
    files: vueFiles(condition),
    prompt: requests[scenario],
    settings: { timeoutMs: 480_000 },
    async setup(session) {
      await session.artifacts.write('vue-comparison.json', {
        scenario, condition, repetition, checkerHash, toolchainHash,
        principleHash: createHash('sha256').update(principle).digest('hex'),
      })
    },
    async observe(session) {
      const verification = await checkVueComponents(session.environment.project, scenario)
      const source = await sourceFiles(session.environment.project)
      await session.artifacts.write('source.json', source)
      return { verification, source }
    },
    graders: {
      'Application behavior': ({ outcome }) => [equal(outcome.verification.detail, outcome.verification.passed, true)],
      'Instruction exposure': ({ transcript }) => [guideExposure(transcript, vueFiles(condition)['guide.md'])],
    },
  })
}
