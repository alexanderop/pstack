import { evaluationSuite } from '@pstack/agent-eval/vitest'
import { staleSearch, csvExport, helpText } from '../tasks/records.js'
import { suiteOptions } from './setup.js'

evaluationSuite({ ...suiteOptions, name: 'Poteto-mode engineering tasks', tasks: [staleSearch, csvExport, helpText] })
