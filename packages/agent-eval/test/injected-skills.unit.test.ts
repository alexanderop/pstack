import { expect, test } from 'vitest'
import { injectedSkills } from '../src/evidence.js'

const text = '<skill>\n<name>pstack:poteto-mode</name>\n<path>/plugin/skills/poteto-mode/SKILL.md</path>\n# Poteto mode\nFull instructions.\n</skill>'
const message = (role: string, content: string) => ({ type: 'response_item', payload: { type: 'message', role, content: [{ type: 'input_text', text: content }] } })
test('recognizes native injected skill bodies separately from file reads', () => {
  expect(injectedSkills([message('user', text)])).toEqual([{
    name: 'pstack:poteto-mode', path: '/plugin/skills/poteto-mode/SKILL.md', content: '# Poteto mode\nFull instructions.\n',
  }])
})
test('does not treat mentions, self reports, or incomplete envelopes as injected instructions', () => {
  expect(injectedSkills([
    message('assistant', text), message('user', 'Please use $pstack:poteto-mode'),
    message('user', 'Here is an example: ' + text), message('user', text.replace('</skill>', '')),
    { type: 'event_msg', payload: { text } }, null,
  ])).toEqual([])
})
