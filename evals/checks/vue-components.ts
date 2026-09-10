import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import vue from '@vitejs/plugin-vue'
import { chromium, type Locator, type Page } from 'playwright'
import { createServer } from 'vite'

const repository = resolve(import.meta.dirname, '../..')

async function tabTo(page: Page, target: Locator) {
  await target.waitFor()
  for (let steps = 0; steps < 40; steps++) {
    if (await target.evaluate(element => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  assert.fail(`Keyboard Tab could not reach ${target}`)
}

async function openDialog(page: Page, title: string) {
  await activate(page, page.getByRole('button', { name: title, exact: true }))
  await page.getByRole('dialog', { name: title, exact: true }).waitFor()
}

async function activate(page: Page, button: Locator) {
  await tabTo(page, button)
  await page.keyboard.press('Enter')
}

async function restoredFocus(page: Page, title: string) {
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  const trigger = await page.getByRole('button', { name: title, exact: true }).elementHandle()
  try {
    await page.waitForFunction(element => element === document.activeElement, trigger, { timeout: 4_000 })
  } catch (error) {
    throw new Error(`Closing ${title} restores focus to its trigger`, { cause: error })
  }
}

async function checkDialogs(page: Page) {
  const dialog = page.getByRole('dialog')
  assert.equal(await dialog.count(), 0, 'Dialogs start closed')
  for (const title of ['Delete document', 'Edit profile', 'Share document']) {
    await openDialog(page, title)
    await page.waitForFunction(element => element?.contains(document.activeElement), await dialog.elementHandle(), { timeout: 4_000 })
    const steps = await dialog.locator('button, input, select, textarea, a[href], [tabindex]').count() + 2
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let step = 0; step < steps; step++) {
        await page.keyboard.press(key)
        assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)
          || (!document.hasFocus() && document.activeElement === document.body)), true, `${title} contains focus after ${key}`)
      }
    }
    await tabTo(page, dialog.getByRole('button').first())
    await page.keyboard.press('Escape')
    await restoredFocus(page, title)
  }

  await openDialog(page, 'Delete document')
  await activate(page, dialog.getByRole('button', { name: 'Cancel', exact: true }))
  await restoredFocus(page, 'Delete document')
  assert.equal(await page.getByText('Document deleted', { exact: true }).count(), 0, 'Cancel must not delete')
  await openDialog(page, 'Delete document')
  await activate(page, dialog.getByRole('button', { name: 'Confirm delete', exact: true }))
  await restoredFocus(page, 'Delete document')
  await page.getByText('Document deleted', { exact: true }).waitFor()

  await openDialog(page, 'Edit profile')
  const name = dialog.getByRole('textbox', { name: /^Name(?:\s*(?:\(required\)|required|\*))?$/i })
  assert.equal(await name.inputValue(), 'Alex')
  await name.fill('Unsaved person')
  await page.keyboard.press('Escape')
  await restoredFocus(page, 'Edit profile')
  await page.getByText('Name: Alex', { exact: true }).waitFor()
  await openDialog(page, 'Edit profile')
  assert.equal(await name.inputValue(), 'Alex', 'Escape discards the unsaved name')
  await name.fill('')
  await activate(page, dialog.getByRole('button', { name: 'Save name', exact: true }))
  await dialog.getByText('Name is required', { exact: true }).waitFor()
  const invalid = await name.evaluate(element => element.getAttribute('aria-invalid') === 'true'
    || (element instanceof HTMLInputElement && !element.validity.valid))
  assert.equal(invalid, true, 'Invalid name is marked for assistive technology')
  const associatedError = await name.evaluate(element => {
    const ids = `${element.getAttribute('aria-describedby') ?? ''} ${element.getAttribute('aria-errormessage') ?? ''}`.trim().split(/\s+/)
    return ids.some(id => document.getElementById(id)?.textContent?.trim() === 'Name is required')
  })
  assert.equal(associatedError, true, 'Name validation error is associated with its input')
  await name.fill('Sam Rivera')
  await activate(page, dialog.getByRole('button', { name: 'Save name', exact: true }))
  await restoredFocus(page, 'Edit profile')
  await page.getByText('Name: Sam Rivera', { exact: true }).waitFor()
  await openDialog(page, 'Edit profile')
  assert.equal(await name.inputValue(), 'Sam Rivera', 'Saved name survives reopening')
  await page.keyboard.press('Escape')
  await restoredFocus(page, 'Edit profile')

  await openDialog(page, 'Share document')
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill('sam@example.com')
  await activate(page, dialog.getByRole('button', { name: 'Invite', exact: true }))
  await restoredFocus(page, 'Share document')
  await page.getByText('Invited: sam@example.com', { exact: true }).waitFor()
  await openDialog(page, 'Share document')
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill('mina@example.com')
  await activate(page, dialog.getByRole('button', { name: 'Invite', exact: true }))
  await restoredFocus(page, 'Share document')
  await page.getByText('Invited: mina@example.com', { exact: true }).waitFor()
  await page.getByText('Name: Sam Rivera', { exact: true }).waitFor()
  await page.getByText('Document deleted', { exact: true }).waitFor()
}

async function checkAvatar(page: Page) {
  await page.getByRole('img', { name: 'Alex Opalic', exact: true }).waitFor()
  await page.getByRole('img', { name: 'Mina Chen', exact: true }).waitFor()
  await page.getByText('AO', { exact: true }).waitFor()
  await page.getByText('MC', { exact: true }).waitFor()
  await activate(page, page.getByRole('button', { name: 'Switch person', exact: true }))
  await page.getByText('SR', { exact: true }).waitFor()
  await page.getByRole('img', { name: 'Sam Rivera', exact: true }).waitFor()
  await page.getByRole('img', { name: 'Alex Opalic', exact: true }).waitFor({ state: 'hidden' })
  await page.getByRole('img', { name: 'Mina Chen', exact: true }).waitFor()
  await page.getByText('AO', { exact: true }).waitFor({ state: 'hidden' })
  await page.getByText('MC', { exact: true }).waitFor()
  assert.equal(await page.getByRole('dialog').count(), 0)
}

async function checkTaskList(page: Page) {
  await page.getByRole('heading', { level: 1, name: 'Team tasks', exact: true }).waitFor()
  await page.getByRole('textbox', { name: 'Workspace name', exact: true }).fill('Release team')
  await activate(page, page.getByRole('button', { name: 'Save workspace name', exact: true }))
  await page.getByRole('heading', { level: 1, name: 'Release team', exact: true }).waitFor()
  const titles = ['Write release notes', 'Review pull request', 'Update dependencies']
  for (const title of titles) await page.getByRole('checkbox', { name: title, exact: true }).waitFor()
  const query = page.getByLabel('Query', { exact: true })
  await query.fill('RELEASE')
  assert.equal(await page.getByRole('checkbox').count(), 3, 'Typing a query does not apply the search')
  await activate(page, page.getByRole('button', { name: 'Search', exact: true }))
  await page.getByRole('checkbox', { name: 'Write release notes', exact: true }).waitFor()
  await page.getByRole('checkbox', { name: 'Review pull request', exact: true }).waitFor({ state: 'hidden' })
  await page.getByRole('checkbox', { name: 'Update dependencies', exact: true }).waitFor({ state: 'hidden' })
  assert.equal(await page.getByRole('checkbox').count(), 1, 'Search displays only its matching task')
  await activate(page, page.getByRole('button', { name: 'Clear search', exact: true }))
  assert.equal(await query.inputValue(), '', 'Clear search empties the query')
  for (const title of titles) await page.getByRole('checkbox', { name: title, exact: true }).waitFor()
  const release = page.getByRole('checkbox', { name: 'Write release notes', exact: true })
  assert.equal(await release.isChecked(), false)
  await tabTo(page, release)
  await page.keyboard.press('Space')
  assert.equal(await release.isChecked(), true, 'Space toggles the focused task')
  assert.equal(await page.getByRole('checkbox', { name: 'Review pull request', exact: true }).isChecked(), false)
  assert.equal(await page.getByRole('checkbox', { name: 'Update dependencies', exact: true }).isChecked(), false)
}

export async function checkVueComponents(project: string, scenario: 'dialogs' | 'avatar' | 'task-list'): Promise<{ passed: boolean; detail: string }> {
  const scratch = resolve(repository, '.eval-artifacts')
  await mkdir(scratch, { recursive: true })
  const root = await mkdtemp(resolve(scratch, 'vue-check-'))
  const diagnostics: string[] = []
  try {
    await cp(resolve(project, 'src'), resolve(root, 'src'), { recursive: true })
    await writeFile(resolve(root, 'index.html'), '<!doctype html><html lang="en"><head><title>Components</title></head><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>')
    await writeFile(resolve(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true,
        noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
        noEmit: true, skipLibCheck: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: [],
      },
      vueCompilerOptions: { strictTemplates: true },
      include: ['src/**/*.ts', 'src/**/*.vue'],
    }))
    await promisify(execFile)(resolve(repository, 'node_modules/.bin/vue-tsc'), ['--project', resolve(root, 'tsconfig.json'), '--noEmit'], { cwd: root, timeout: 30_000 })
    const server = await createServer({ root, cacheDir: resolve(root, '.vite'), configFile: false, plugins: [vue()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' })
    try {
      await server.listen()
      const address = server.httpServer?.address()
      if (!address || typeof address === 'string') throw new Error('Vite did not expose a local port')
      const browser = await chromium.launch({ headless: true })
      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(4_000)
        const errors: string[] = []
        page.on('pageerror', error => { errors.push(error.message); diagnostics.push(`Browser error: ${error.message}`) })
        page.on('console', message => {
          if (message.type() === 'error' || message.type() === 'warning') diagnostics.push(`Console ${message.type()}: ${message.text()}`)
        })
        page.on('requestfailed', request => diagnostics.push(`Request failed: ${request.url()} ${request.failure()?.errorText ?? ''}`))
        page.on('response', response => {
          if (response.status() >= 400) diagnostics.push(`HTTP ${response.status()}: ${response.url()}`)
        })
        await page.goto(`http://127.0.0.1:${address.port}`, { waitUntil: 'networkidle' })
        if (scenario === 'dialogs') await checkDialogs(page)
        else if (scenario === 'avatar') await checkAvatar(page)
        else await checkTaskList(page)
        assert.deepEqual(errors, [], 'Application must not throw browser errors')
      } finally { await browser.close() }
    } finally { await server.close() }
    return { passed: true, detail: `Strict Vue typecheck and Chromium ${scenario} interactions passed` }
  } catch (error) {
    const output = error instanceof Error && 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : ''
    return { passed: false, detail: [error instanceof Error ? error.message : String(error), output, ...diagnostics.slice(0, 20)].filter(Boolean).join('\n') }
  } finally { await rm(root, { recursive: true, force: true }) }
}
