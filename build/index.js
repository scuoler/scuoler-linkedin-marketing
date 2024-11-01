"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg = require("pg");
const fs = require("fs").promises;
const htmlEntities = require("html-entities");
const constants = require("../Constants");
require("dotenv").config();
const configuration = require("../Configuration");
const getPool = () => {
    const pool = new pg.Pool({
        host: configuration.getHost(),
        user: configuration.getUserId(),
        password: configuration.getPassword(),
        database: configuration.getDatabase(),
        port: configuration.getPort(),
        ssl: { rejectUnauthorized: false },
    });
    return pool;
};
const getRandomCourse = () => {
    const pool = getPool();
    let sql = `  select 
   id, name, description, author_id, thumbnail, type, launch_file, 
   creative_commons, source, rating, likes 
   from public.course_get_one_random_for_linkedin_marketing()`;
    return new Promise((resolve, reject) => {
        pool.query(sql, [], function (err, result) {
            pool.end(() => { });
            if (err) {
                reject(err);
            }
            else {
                let answer = [];
                for (let i = 0; i < result.rows.length; i++) {
                    answer.push(result.rows[i]);
                }
                resolve(answer);
            }
        });
    });
};
const getRandomQuiz = () => {
    const pool = getPool();
    let sql = `  select 
   id, name, description, author_id, thumbnail, type, 
    source, rating, likes, categories 
   from public.quiz_get_one_random_for_linkedin_marketing()`;
    return new Promise((resolve, reject) => {
        pool.query(sql, [], function (err, result) {
            pool.end(() => { });
            if (err) {
                reject(err);
            }
            else {
                let answer = [];
                for (let i = 0; i < result.rows.length; i++) {
                    answer.push(result.rows[i]);
                }
                resolve(answer);
            }
        });
    });
};
const getRandomProblem = () => {
    const pool = getPool();
    let sql = `  select 
   id, description, options, author_id, type, 
    source, rating, likes, categories 
   from public.problem_get_one_random_for_linkedin_marketing()`;
    return new Promise((resolve, reject) => {
        pool.query(sql, [], function (err, result) {
            pool.end(() => { });
            if (err) {
                reject(err);
            }
            else {
                let answer = [];
                for (let i = 0; i < result.rows.length; i++) {
                    answer.push(result.rows[i]);
                }
                resolve(answer);
            }
        });
    });
};
const setLinkedSentTimestamp = (entityName, entityId) => {
    const pool = getPool();
    let sql = `
     update ${entityName} set linkedin_sent_timestamp=now(), modified_timestamp=now()
      where id=$1
    `;
    return new Promise((resolve, reject) => {
        pool.query(sql, [entityId], function (err, result) {
            pool.end(() => { });
            if (err) {
                reject(err);
            }
            else {
                resolve("linkedin sent timestamp updated");
            }
        });
    });
};
function getPersonId() {
    let personId;
    if (process.env.NODE_ENV === "production") {
        personId = process.env.PERSON_ID;
    }
    else {
        personId = process.env.PERSON_ID_TEST;
    }
    return personId;
}
function getAccessTokenPath() {
    let access_token_path;
    if (process.env.NODE_ENV === "production") {
        access_token_path = process.env.ACCESS_TOKEN_FILEPATH;
    }
    else {
        access_token_path = process.env.ACCESS_TOKEN_FILEPATH_TEST;
    }
    return access_token_path;
}
async function getLinkedInAccessToken() {
    const data = await fs.readFile(getAccessTokenPath(), "utf8");
    const { linkedInAccessToken } = JSON.parse(data);
    console.log(linkedInAccessToken);
    return linkedInAccessToken;
}
const createLinkedInShare = async (linkedInAccessToken, entityLocation, thumbnail, name, text) => {
    const headers = {
        Authorization: "Bearer " + linkedInAccessToken,
        "cache-control": "no-cache",
        "X-Restli-Protocol-Version": "2.0.0",
        Accept: "application/json",
        "Content-type": "application/json",
    };
    const body = {
        content: {
            contentEntities: [
                {
                    entityLocation: entityLocation,
                    thumbnails: [
                        {
                            resolvedUrl: thumbnail,
                        },
                    ],
                },
            ],
            title: name,
        },
        distribution: {
            linkedInDistributionTarget: {},
        },
        owner: `urn:li:person:${getPersonId()}`,
        //owner: `urn:li:organization:86017971`,
        subject: htmlEntities.decode(text),
        text: {
            text: htmlEntities.decode(text),
        },
    };
    console.log(body);
    const url = "https://api.linkedin.com/v2/shares";
    let res = await fetch(url, {
        headers: headers,
        method: "POST",
        body: JSON.stringify(body),
    });
    console.log(res);
    /*const json: any = await res.json();
    return json;*/
};
const convertToAbsoluteUrl = (url) => {
    if (!url)
        return "";
    if (url.trim().startsWith("http")) {
        return url;
    }
    else {
        return `https://${constants.LETSENCRYPT_DOMAIN_NAME}/${url}`;
    }
};
const createLinkedInShareForCourse = async (linkedInAccessToken) => {
    let courseArr = await getRandomCourse();
    if (courseArr.length > 0) {
        const entityLocation = `https://${constants.LETSENCRYPT_DOMAIN_NAME}/courseShowSelected/${courseArr[0].id}`;
        const text = `Upskill yourself with the new course titled '${courseArr[0].name}' on https://${constants.LETSENCRYPT_DOMAIN_NAME} platform. ` +
            `Browse more courses at https://${constants.LETSENCRYPT_DOMAIN_NAME}/coursesBrowse and start your personal learning experience.`;
        let thumbnailUrl = "https://scuoler.com/static/media/scuoler_logo.3a634752982670eac2eb8b3981a0c162.svg";
        if (courseArr[0].thumbnail) {
            thumbnailUrl = convertToAbsoluteUrl(courseArr[0].thumbnail);
        }
        let res;
        res = await createLinkedInShare(linkedInAccessToken, entityLocation, thumbnailUrl, courseArr[0].name, text);
        console.log(res);
        res = await setLinkedSentTimestamp('course', courseArr[0]?.id);
        console.log(res);
    }
};
const createLinkedInShareForQuiz = async (linkedInAccessToken) => {
    let quizArr = await getRandomQuiz();
    if (quizArr.length > 0) {
        const entityLocation = `https://${constants.LETSENCRYPT_DOMAIN_NAME}/quizShowSelected/${quizArr[0].id}`;
        const categories = quizArr[0].categories;
        const text = `Refresh and test your knowledge ` +
            ((categories.length >= 0) ? `in area(s): ${categories.join(", ")},` : ``) +
            ` by taking the new quiz titled '${quizArr[0].name}' on https://${constants.LETSENCRYPT_DOMAIN_NAME} platform. ` +
            (quizArr[0].source ? `\n Author: ${quizArr[0].source} \n` : ``) +
            `Browse and solve more quizes at https://${constants.LETSENCRYPT_DOMAIN_NAME}/quizesBrowse and keep your knowledge up-to-date.`;
        let thumbnailUrl = "https://scuoler.com/static/media/scuoler_logo.3a634752982670eac2eb8b3981a0c162.svg";
        if (quizArr[0].thumbnail)
            thumbnailUrl = convertToAbsoluteUrl(quizArr[0].thumbnail);
        let res;
        res = await createLinkedInShare(linkedInAccessToken, entityLocation, thumbnailUrl, quizArr[0].name, text);
        console.log(res);
        res = await setLinkedSentTimestamp('quiz', quizArr[0]?.id);
        console.log(res);
    }
};
const createLinkedInShareForProblem = async (linkedInAccessToken) => {
    let problemArr = await getRandomProblem();
    if (problemArr.length > 0) {
        const entityLocation = `https://${constants.LETSENCRYPT_DOMAIN_NAME}/problemShowSelected/${problemArr[0].id}`;
        const categories = problemArr[0].categories;
        const options = problemArr[0]?.options;
        let description = problemArr[0].description.replace(/<[^>]*>?/gm, '');
        //compress consecutive new lines with just one
        description = description.replace(/\n\s*\n/g, '\n');
        const text = `Refresh and test your knowledge ` +
            ((categories && categories.length >= 0) ? `in area(s): ${categories.join(", ")},` : ``) +
            ` by solving the following problem:\n ${description} ` +
            ((options.length > 0) ? `\nOptions: \n${options.reduce((accumulator, val, index) => {
                let option = val.replace(/<[^>]*>?/gm, '');
                return accumulator + '\n' + (index + 1) + ') ' + option;
            }, '')}\n` : ``) +
            `on https://${constants.LETSENCRYPT_DOMAIN_NAME} platform. ` +
            (problemArr[0].source ? ` Author: ${problemArr[0].source} ` : ``) +
            `, Browse and solve more problems at https://${constants.LETSENCRYPT_DOMAIN_NAME}/problemsBrowse and upskill your knowledge.`;
        const thumbnailUrl = '';
        const name = 'Scuoler Problem Challenge';
        let res;
        console.log(thumbnailUrl, text);
        res = await createLinkedInShare(linkedInAccessToken, entityLocation, thumbnailUrl, name, text);
        console.log(res);
        res = await setLinkedSentTimestamp('problem', problemArr[0]?.id);
        console.log(res);
    }
};
const main = async () => {
    const linkedInAccessToken = await getLinkedInAccessToken();
    if (linkedInAccessToken) {
        await createLinkedInShareForCourse(linkedInAccessToken);
        // await createLinkedInShareForQuiz(linkedInAccessToken);
        //await createLinkedInShareForProblem(linkedInAccessToken);
    }
};
main();
