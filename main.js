// Made some changes
const Apify = require('apify')
const typeCheck = require('type-check').typeCheck
const request = require('request-promise')
const replace = require('lodash').replace
const uniq = require('lodash').uniq

const def_json = require('./dummy/def.json')
// const conj_rv_json = require('./dummy/conj-rv.json')
const conj_json = require('./dummy/conj-wr.json')

const PHRASE_TYPE = `{
    external_id: String
    row00: String
    row01: String
    row02: String
    row03: String
    row04: String
    row05: String
    row06: String
    row07: String
    row08: String
    row09: String
    row10: String
    row11: String
    row12: String
    row13: String
    row14: String
    row15: String
    row16: String
    row17: String
    row18: String
    row19: String
    row20: String
    row21: String
    row22: String
    row23: String
    row24: String
    row25: String
    row26: String
    row27: String
    row28: String
    row29: String
    audio00: String
    audio01: String
    audio02: String
    audio03: String
    audio04: String
    audio05: String
    audio06: String
    audio07: String
    audio08: String
    audio09: String
    audio10: String
    audio11: String
    audio12: String
    audio13: String
    audio14: String
    audio15: String
    audio16: String
    audio17: String
    audio18: String
    audio19: String
    audio20: String
    audio21: String
    audio22: String
    audio23: String
    audio24: String
    audio25: String
    audio26: String
    audio27: String
    audio28: String
    audio29: String
    flag_novoice: String
    flag_intermd: String
    flag_expert: String
    lang: String
    tags: [String]
}`

// Definition of the input
const INPUT_TYPE = `{
    input: {
        translation: String
        source: String
        query: String
    }
    phrases: [${PHRASE_TYPE}]
}`

const LEVEL_TYPE = {
    NOVOICE: 'NOVOICE',
    INTERMEDIATE: 'INTERMEDIATE',
    EXPERT: 'EXPERT'
}

Apify.main(async () => {
    // Fetch the input and check it has a valid format
    // You don't need to check the input, but it's a good practice.
    const input = await Apify.getValue('INPUT')
    if (!typeCheck(INPUT_TYPE, input)) {
        console.log('Expected input:')
        console.log(INPUT_TYPE)
        console.log('Received input:')
        console.dir(input)
        throw new Error('Received invalid input')
    }

    console.log('input', input)

    // https://github.com/request/request-promise
    // Run act synchronously
    const act_conjugation_wr_api_option = {
        method: 'POST',
        uri: 'https://api.apify.com/v2/acts/igsys~conjugation-wordreference/run-sync?token=fDwYYKCbe2SzRfpTvMk4BGspj&timeout=300',
        body: input.input,
        json: true,
        timeout: 300000,
    }

    const conj = await request(act_conjugation_wr_api_option)
    console.log('conj', conj)
    const { phrases } = input

    let results = []
    phrases.forEach(item => {
        let result = {}
        // initialization
        let phrase = ''
        let form_tenses = []
        conj.results.forEach(verb => {
            if (item.row03.includes(verb.conjugation + ' ')) {
                phrase = replace(item.row03, verb.conjugation + ' ', `{{c1:${verb.conjugation}}} `)
                const pronounStr = verb.pronoun === '' ? '' : `:${verb.pronoun}`
                const verbStr = verb.tense === '' ? '' : `:${verb.tense}`
                form_tenses.push(`[${verb.form}${verbStr}${pronounStr}]`)
                gender = verb.gender
            }
        })

        form_tenses = uniq(form_tenses)
        let tense = ''
        form_tenses.forEach(item => {
            tense = tense + ' ' + item
        })

        result = Object.assign(item, {
            row05: phrase,
            row12: tense.trim()
        })

        results.push(result)
    })

    const output = {
        crawledAt: new Date(),
        name: 'apify/igsys/phrase-conjugation',
        input,
        phrases: results,
    }
    console.log('output', output)
    await Apify.setValue('OUTPUT', output)
})
