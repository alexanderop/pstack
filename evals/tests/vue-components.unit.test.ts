import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { checkVueComponents } from '../checks/vue-components.js'

const projects: string[] = []
afterEach(async () => { await Promise.all(projects.splice(0).map(project => rm(project, { recursive: true, force: true }))) })

async function project(app: string, files: Readonly<Record<string, string>> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'vue-check-test-'))
  projects.push(root)
  await mkdir(join(root, 'src'))
  for (const [name, source] of Object.entries({ 'main.ts': "import { createApp } from 'vue'; import App from './App.vue'; createApp(App).mount('#app')", 'App.vue': app, ...files })) {
    await writeFile(join(root, 'src', name), source)
  }
  return root
}

const dialogs = `<script setup lang="ts">
import { ref } from 'vue'
const deletion = ref<HTMLDialogElement | null>(null)
const edit = ref<HTMLDialogElement | null>(null)
const share = ref<HTMLDialogElement | null>(null)
const deleted = ref(false)
const name = ref('Alex')
const draft = ref('Alex')
const email = ref('')
const invited = ref('')
const invalid = ref(false)
function saveName() {
  invalid.value = draft.value.trim().length === 0
  if (invalid.value) return
  name.value = draft.value
  edit.value?.close()
}
</script>
<template>
  <button @click="deletion?.showModal()">Delete document</button>
  <button @click="draft = name; edit?.showModal()">Edit profile</button>
  <button @click="share?.showModal()">Share document</button>
  <p v-if="deleted">Document deleted</p><p>Name: {{ name }}</p>
  <p v-if="invited">Invited: {{ invited }}</p>
  <dialog ref="deletion" aria-label="Delete document">
    <h2>Delete document</h2>
    <button @click="deletion?.close()">Cancel</button>
    <button @click="deleted = true; deletion?.close()">Confirm delete</button>
  </dialog>
  <dialog ref="edit" aria-label="Edit profile">
    <h2>Edit profile</h2><label>Name<input v-model="draft" :aria-invalid="invalid" aria-describedby="name-error"></label>
    <p v-if="invalid" id="name-error">Name is required</p>
    <button @click="saveName">Save name</button>
  </dialog>
  <dialog ref="share" aria-label="Share document">
    <h2>Share document</h2><label>Email<input v-model="email" type="email"></label>
    <button @click="invited = email; share?.close()">Invite</button>
  </dialog>
</template>`

const taskList = `<script setup lang="ts">
import { computed, ref } from 'vue'
const query = ref('')
const appliedQuery = ref('')
const workspaceName = ref('Team tasks')
const savedWorkspaceName = ref('Team tasks')
const tasks = ref([
  { title: 'Write release notes', done: false },
  { title: 'Review pull request', done: false },
  { title: 'Update dependencies', done: false },
])
const visibleTasks = computed(() => tasks.value.filter(task => task.title.toLowerCase().includes(appliedQuery.value.toLowerCase())))
</script>
<template>
  <h1>{{ savedWorkspaceName }}</h1>
  <label>Workspace name<input v-model="workspaceName"></label>
  <button @click="savedWorkspaceName = workspaceName">Save workspace name</button>
  <label>Query<input type="search" v-model="query"></label>
  <button @click="appliedQuery = query">Search</button>
  <button @click="query = ''; appliedQuery = ''">Clear search</button>
  <ul><li v-for="task in visibleTasks" :key="task.title"><label><input type="checkbox" v-model="task.done">{{ task.title }}</label></li></ul>
</template>`

test('accepts functional dialogs with cancellation, saving, invitations, and reopening', async () => {
  const result = await checkVueComponents(await project(dialogs), 'dialogs')
  expect(result, result.detail).toEqual({ passed: true, detail: 'Strict Vue typecheck and Chromium dialogs interactions passed' })
}, 60_000)

test('runs independent dialog checks concurrently', async () => {
  const roots = await Promise.all([project(dialogs), project(dialogs)])
  const results = await Promise.all(roots.map(root => checkVueComponents(root, 'dialogs')))
  expect(results, results.map(result => result.detail).join('\n')).toEqual([
    { passed: true, detail: 'Strict Vue typecheck and Chromium dialogs interactions passed' },
    { passed: true, detail: 'Strict Vue typecheck and Chromium dialogs interactions passed' },
  ])
}, 60_000)

test('includes browser failure diagnostics when a component cannot mount', async () => {
  const result = await checkVueComponents(await project('<script setup lang="ts">throw new Error("Mount failed deliberately")</script><template><main>Ready</main></template>'), 'dialogs')
  expect(result.passed).toBe(false)
  expect(result.detail).toContain('Browser error: Mount failed deliberately')
}, 60_000)

test('rejects a delete action that closes without updating the document', async () => {
  const result = await checkVueComponents(await project(dialogs.replace('deleted = true;', 'deleted = false;')), 'dialogs')
  expect(result.passed).toBe(false)
  expect(result.detail).toContain('Document deleted')
}, 60_000)

test('rejects an edit form that retains a cancelled draft', async () => {
  const result = await checkVueComponents(await project(dialogs.replace('draft = name;', '')), 'dialogs')
  expect(result.passed).toBe(false)
  expect(result.detail).toContain('Escape discards the unsaved name')
}, 60_000)

test('rejects a validation error without an input association', async () => {
  const result = await checkVueComponents(await project(dialogs.replace('aria-describedby="name-error"', '')), 'dialogs')
  expect(result.passed).toBe(false)
  expect(result.detail).toContain('Name validation error is associated with its input')
}, 60_000)

test('accepts a name label with a required indicator', async () => {
  const source = dialogs.replace('<label>Name<input', '<label>Name <span>(required)</span><input')
  const result = await checkVueComponents(await project(source), 'dialogs')
  expect(result, result.detail).toEqual({ passed: true, detail: 'Strict Vue typecheck and Chromium dialogs interactions passed' })
}, 60_000)

test('accepts native required validity with an associated visible error', async () => {
  const source = dialogs.replace(':aria-invalid="invalid"', 'required')
  const result = await checkVueComponents(await project(source), 'dialogs')
  expect(result, result.detail).toEqual({ passed: true, detail: 'Strict Vue typecheck and Chromium dialogs interactions passed' })
}, 60_000)

test('rejects a dialog that moves closing focus away from its trigger', async () => {
  const source = dialogs.replace('const invalid = ref(false)', `const invalid = ref(false)
function closeWrong() {
  deletion.value?.close()
  document.querySelector<HTMLButtonElement>('button')?.blur()
}`).replace('<dialog ref="deletion"', '<dialog @cancel.prevent="closeWrong" ref="deletion"')
  const result = await checkVueComponents(await project(source), 'dialogs')
  expect(result.passed).toBe(false)
  expect(result.detail).toContain('Closing Delete document restores focus to its trigger')
}, 60_000)

test('rejects a dialog that lets Tab reach background controls', async () => {
  const result = await checkVueComponents(await project(dialogs.replace('deletion?.showModal()', 'deletion?.show()')), 'dialogs')
  expect(result.passed).toBe(false)
  expect(result.detail).toContain('Delete document contains focus after Tab')
}, 60_000)

test('accepts labelled task search and keyboard completion', async () => {
  const result = await checkVueComponents(await project(taskList), 'task-list')
  expect(result, result.detail).toEqual({ passed: true, detail: 'Strict Vue typecheck and Chromium task-list interactions passed' })
}, 60_000)

test('rejects task checkboxes without accessible labels', async () => {
  const source = taskList.replace('<label><input type="checkbox" v-model="task.done">{{ task.title }}</label>', '<input type="checkbox" v-model="task.done"><span>{{ task.title }}</span>')
  const result = await checkVueComponents(await project(source), 'task-list')
  expect(result.passed).toBe(false)
  expect(result.detail).toContain('Write release notes')
}, 60_000)

test('rejects search that keeps unrelated tasks visible', async () => {
  const result = await checkVueComponents(await project(taskList.replace('appliedQuery = query', "appliedQuery = ''")), 'task-list')
  expect(result.passed).toBe(false)
  expect(result.detail).toContain('Review pull request')
}, 60_000)

test('rejects avatars without accessible names', async () => {
  const result = await checkVueComponents(await project('<template><span role="img">AO</span><span role="img">MC</span><button>Switch person</button></template>'), 'avatar')
  expect(result.passed).toBe(false)
  expect(result.detail).toContain('Alex Opalic')
}, 60_000)

test('accepts reactive initials in two independent avatar instances', async () => {
  const root = await project(`<script setup lang="ts">
import { ref } from 'vue'
import Avatar from './Avatar.vue'
const name = ref('Alex Opalic')
</script>
<template><Avatar :name="name"/><Avatar name="Mina Chen"/><button @click="name = 'Sam Rivera'">Switch person</button></template>`, {
    'Avatar.vue': `<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ name: string }>()
const initials = computed(() => props.name.split(' ').map(part => part[0] ?? '').join(''))
</script><template><span role="img" :aria-label="name">{{ initials }}</span></template>`,
  })
  const result = await checkVueComponents(root, 'avatar')
  expect(result, result.detail).toEqual({ passed: true, detail: 'Strict Vue typecheck and Chromium avatar interactions passed' })
}, 60_000)

test.each(['dialogs', 'avatar', 'task-list'] satisfies ('dialogs' | 'avatar' | 'task-list')[])('rejects the blank starting app for %s', async scenario => {
  const result = await checkVueComponents(await project('<template><main>Ready</main></template>'), scenario)
  expect(result.passed).toBe(false)
  expect(result.detail).toContain('Timeout')
}, 60_000)
