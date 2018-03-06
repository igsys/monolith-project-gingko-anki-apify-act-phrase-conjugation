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

    console.log('input', input)

    // https://github.com/request/request-promise
    // Run act synchronously
    const act_definition_api_option = {
        method: 'POST',
        uri: 'https://api.apify.com/v2/acts/igsys~linguee/run-sync?token=fDwYYKCbe2SzRfpTvMk4BGspj',
        body: input,
        json: true
    };
    // const act_conjugation_rv_api_option = {
    //     method: 'POST',
    //     uri: 'https://api.apify.com/v2/acts/igsys~conjugation-reverso/run-sync?token=fDwYYKCbe2SzRfpTvMk4BGspj',
    //     body: input,
    //     json: true
    // };
    const act_conjugation_wr_api_option = {
        method: 'POST',
        uri: 'https://api.apify.com/v2/acts/igsys~conjugation-wordreference/run-sync?token=fDwYYKCbe2SzRfpTvMk4BGspj',
        body: input,
        json: true
    };

    // wait until all branches of API request are done, and return results
    const response = process.env.NODE_ENV === 'development'
        ? [def_json, conj_json]
        : await Promise.all([request(act_definition_api_option), request(act_conjugation_wr_api_option)])
    const [def, conj] = response;

    // replace conjugations
    let phrases = [];
    def.definitions.forEach(item => {
        item.examples.forEach(example => {
            // initialization
            let phrase = ''
            let form_tenses = []
            let gender = 'm'

            // replace conjugations to anki card syntax
            conj.results.forEach(verb => {
                if (example.mono.includes(verb.conjugation + ' ')) {
                    // console.log('example.mono.replace', replace(example.mono, verb.conjugation + ' ', `{{c1:${verb.conjugation}}} `))
                    // console.log('form:tense', verb.form, verb.tense)
                    phrase = replace(example.mono, verb.conjugation + ' ', `{{c1:${verb.conjugation}}} `)
                    const pronounStr = verb.pronoun === '' ? '' : `:${verb.pronoun}`
                    const verbStr = verb.tense === '' ? '' : `:${verb.tense}`
                    form_tenses.push(`[${verb.form}${verbStr}${pronounStr}]`)
                    gender = verb.gender
                }
            })

            // form tense string from unique array
            form_tenses = uniq(form_tenses);
            let tense = '';
            form_tenses.forEach(item => {
                tense = tense + ' ' + item;
            });

            // push into phrases array for output
            phrases.push({
                dict_def: input.query,
                dict_def_language: input.source,
                dict_def_gender: gender,
                dict_def_grammar: item.grammar,
                dict_def_meaning: item.meaning,
                phrase_level: example.level,
                phrase_mono_org: example.mono,
                phrase_mono: phrase,
                phrase_tran: example.tran,
                phrase_tense: tense.trim(),
                flag_novoice: example.level === LEVEL_TYPE.NOVOICE ? 'y' : null,
                flag_intermd: example.level === LEVEL_TYPE.INTERMEDIATE ? 'y' : null,
                flag_expert: example.level === LEVEL_TYPE.EXPERT ? 'y' : null,
                dict_def_conj_uri: `https://conjugator.reverso.net/conjugation-${input.source}-verb-${input.query}.html`,
                tag_study: '#sdy.phrase',
                tag_language: `#lng.${input.source}`,
                tag_level: `#lvl.${example.level.toLowerCase()}`
            })
        })
    })

    const output = {
        crawledAt: new Date(),
        name: 'apify/igsys/phrase-conjugation',
        phrases
    }
    console.log('output', output)
    await Apify.setValue('OUTPUT', output)
});
