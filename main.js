// Made some changes
const Apify = require('apify');
const typeCheck = require('type-check').typeCheck;
const request = require('request-promise');
const replace = require('lodash').replace;
const uniq = require('lodash').uniq;

const def_json = require('./dummy/def.json');
// const conj_rv_json = require('./dummy/conj-rv.json');
const conj_json = require('./dummy/conj-wr.json');

// Definition of the input
const INPUT_TYPE = `{
    query: String,
    source: String,
    dictionary: String
}`;

const LEVEL_TYPE = {
    NOVOICE: 'NOVOICE',
    INTERMEDIATE: 'INTERMEDIATE',
    EXPERT: 'EXPERT'
}

Apify.main(async () => {
    // Fetch the input and check it has a valid format
    // You don't need to check the input, but it's a good practice.
    const input = await Apify.getValue('INPUT');
    if (!typeCheck(INPUT_TYPE, input)) {
        console.log('Expected input:');
        console.log(INPUT_TYPE);
        console.log('Received input:');
        console.dir(input);
        throw new Error('Received invalid input');
    }

    // https://github.com/request/request-promise
    // Run act synchronously
    const act_definition_api_option = {
        method: 'POST',
        uri: 'https://api.apify.com/v2/acts/igsys~linguee/run-sync?token=fDwYYKCbe2SzRfpTvMk4BGspj',
        body: input,
        json: true
    };
    const act_conjugation_rv_api_option = {
        method: 'POST',
        uri: 'https://api.apify.com/v2/acts/igsys~conjugation-reverso/run-sync?token=fDwYYKCbe2SzRfpTvMk4BGspj',
        body: input,
        json: true
    };
    const act_conjugation_wr_api_option = {
        method: 'POST',
        uri: 'https://api.apify.com/v2/acts/igsys~conjugation-wordreference/run-sync?token=fDwYYKCbe2SzRfpTvMk4BGspj',
        body: input,
        json: true
    };

    const response = process.env.NODE_ENV === 'development'
        ? [def_json, conj_json]
        : await Promise.all([request(act_definition_api_option), request(act_conjugation_wr_api_option)])
    const [def, conj] = response;
    let phrases = [];

    def.definitions.forEach(item => {
        item.examples.forEach(example => {
            let phrase = '';
            let form_tenses = [];
            conj.results.forEach(verb => {
                if (example.mono.includes(verb.conjugation + ' ')) {
                    console.log('example.mono.replace', replace(example.mono, verb.conjugation + ' ', `{{c1:${verb.conjugation}}} `))
                    console.log('form:tense', verb.form, verb.tense)
                    phrase = replace(example.mono, verb.conjugation + ' ', `{{c1:${verb.conjugation}}} `)
                    const pronounStr = verb.pronoun === '' ? '' : ` - ${verb.pronoun}`
                    const verbStr = verb.tense === '' ? '' : ` - ${verb.tense}`
                    form_tenses.push(`[${verb.form}${verbStr}${pronounStr}]`)
                }
            })
            phrases.push({
                keyword: input.query,
                grammar: item.grammar,
                meaning: item.meaning,
                level: example.level,
                mono: phrase,
                tenses: uniq(form_tenses),
                tran: example.tran
            })
        })
    })

    const output = {
        phrases
    }
    console.log('output', output)
    await Apify.setValue('OUTPUT', output)
});
