import { Pool, QueryResult } from "pg";

const pg = require("pg");
const fs = require("fs").promises;
const htmlEntities = require("html-entities");
const constants = require("../Constants");

require("dotenv").config();


const configuration = require("../Configuration");

const getPool: () => Pool = () => {
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

const getRandomCourse: () => Promise<any[]> = () => {
    const pool: Pool = getPool();

    let sql: string = `  select 
   id, name, description, author_id, thumbnail, type, launch_file, 
   creative_commons, source, rating, likes 
   from public.course_get_one_random_for_linkedin_marketing()`;
    return new Promise((resolve, reject) => {
        pool.query(sql, [], function (err: Error, result: QueryResult) {
            pool.end(() => { });
            if (err) {
                reject(err);
            } else {
                let answer = [];
                for (let i = 0; i < result.rows.length; i++) {
                    answer.push(result.rows[i]);
                }
                resolve(answer);
            }
        });
    });
};

const getRandomQuiz: () => Promise<any[]> = () => {
    const pool: Pool = getPool();

    let sql: string = `  select 
   id, name, description, author_id, thumbnail, type, 
    source, rating, likes, categories 
   from public.quiz_get_one_random_for_linkedin_marketing()`;
    return new Promise((resolve, reject) => {
        pool.query(sql, [], function (err: Error, result: QueryResult) {
            pool.end(() => { });
            if (err) {
                reject(err);
            } else {
                let answer = [];
                for (let i = 0; i < result.rows.length; i++) {
                    answer.push(result.rows[i]);
                }
                resolve(answer);
            }
        });
    });
};

const getRandomProblem: () => Promise<any[]> = () => {
    const pool: Pool = getPool();

    let sql: string = `  select 
   id, description, options, author_id, type, 
    source, rating, likes, categories 
   from public.problem_get_one_random_for_linkedin_marketing()`;
    return new Promise((resolve, reject) => {
        pool.query(sql, [], function (err: Error, result: QueryResult) {
            pool.end(() => { });
            if (err) {
                reject(err);
            } else {
                let answer = [];
                for (let i = 0; i < result.rows.length; i++) {
                    answer.push(result.rows[i]);
                }
                resolve(answer);
            }
        });
    });
};

const setLinkedSentTimestamp: (entityName: string, entityId: string) => Promise<any>
    = (entityName: string, entityId: string) => {
        const pool: Pool = getPool();
        let sql: string = `
     update ${entityName} set linkedin_sent_timestamp=now(), modified_timestamp=now()
      where id=$1
    `;
        return new Promise((resolve, reject) => {
            pool.query(sql, [entityId], function (err: Error, result: QueryResult) {
                pool.end(() => { });
                if (err) {
                    reject(err);
                } else {
                    resolve("linkedin sent timestamp updated");
                }
            });
        });
    }

function getPersonId(): string | undefined {
    let personId: string | undefined;
    if (process.env.NODE_ENV === "production") {
        personId = process.env.PERSON_ID;
    } else {
        personId = process.env.PERSON_ID_TEST;
    }
    return personId;
}

function getAccessTokenPath(): string | undefined {
    let access_token_path: string | undefined;
    if (process.env.NODE_ENV === "production") {
        access_token_path = process.env.ACCESS_TOKEN_FILEPATH;
    } else {
        access_token_path = process.env.ACCESS_TOKEN_FILEPATH_TEST;
    }
    return access_token_path;
}

async function getLinkedInAccessToken(): Promise<string | undefined> {
    const data: string = await fs.readFile(getAccessTokenPath(), "utf8");
    const { linkedInAccessToken }: any = JSON.parse(data);
    console.log(linkedInAccessToken);
    return linkedInAccessToken;
}

const createLinkedInShare: (linkedInAccessToken: string, entityLocation: string, thumbnail: string, name: string, text: string)
    => void = async (linkedInAccessToken: string, entityLocation: string, thumbnail: string, name: string, text: string) => {

        text = text.replace(/\n\s*\n/g, '\n');

        const headers: any = {
            Authorization: "Bearer " + linkedInAccessToken,
            "cache-control": "no-cache",
            "X-Restli-Protocol-Version": "2.0.0",
            Accept: "application/json",
            "Content-type": "application/json",
        };

        const body: any = {
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
        //console.log(body);

        const url: string = "https://api.linkedin.com/v2/shares";

        let res: Response = await fetch(url, {
            headers: headers,
            method: "POST",
            body: JSON.stringify(body),
        });

        //console.log(res);

        const json: any = await res.json();
        return json;
    };

const convertToAbsoluteUrl: (url: string) => string = (url: string) => {
    if (!url)
        return "";
    if (url.trim().startsWith("http")) {
        return url;
    }
    else {
        return `https://${constants.LETSENCRYPT_DOMAIN_NAME}/${url}`;
    }
}

const createLinkedInShareForCourse: (linkedInAccessToken: string) => void = async (linkedInAccessToken: string) => {
    let courseArr: any[] = await getRandomCourse();
    if (courseArr.length > 0) {
        const entityLocation: string = `https://${constants.LETSENCRYPT_DOMAIN_NAME}/courseShowSelected/${courseArr[0].id}`;
        const text: string =
            `Upskill yourself with the new course titled '${courseArr[0].name}' on https://${constants.LETSENCRYPT_DOMAIN_NAME} platform. ` +
            `Browse more courses at https://${constants.LETSENCRYPT_DOMAIN_NAME}/coursesBrowse and start your personal learning experience.`;
        let thumbnailUrl: string = "https://scuoler.com/static/media/scuoler_logo.3a634752982670eac2eb8b3981a0c162.svg";
        if (courseArr[0].thumbnail) {
            thumbnailUrl = convertToAbsoluteUrl(courseArr[0].thumbnail);
        }
        let res: any;
        res = await createLinkedInShare(linkedInAccessToken, entityLocation, thumbnailUrl, courseArr[0].name, text);
        console.log(res);
        res = await setLinkedSentTimestamp('course', courseArr[0]?.id)
        console.log(res);
    }
};

const createLinkedInShareForQuiz: (linkedInAccessToken: string) => void = async (linkedInAccessToken: string) => {
    let quizArr: any[] = await getRandomQuiz();
    if (quizArr.length > 0) {
        const entityLocation: string = `https://${constants.LETSENCRYPT_DOMAIN_NAME}/quizShowSelected/${quizArr[0].id}`;
        const categories: string[] = quizArr[0].categories;
        const text: string =
            `Refresh and test your knowledge ` +
            ((categories.length >= 0) ? `in area(s): ${categories.join(", ")},` : ``) +
            ` by taking the new quiz titled '${quizArr[0].name}' on https://${constants.LETSENCRYPT_DOMAIN_NAME} platform. ` +
            (quizArr[0].source ? `\n Author: ${quizArr[0].source} \n` : ``) +
            `Browse and solve more quizes at https://${constants.LETSENCRYPT_DOMAIN_NAME}/quizesBrowse and keep your knowledge up-to-date.`;
        let thumbnailUrl: string = "https://scuoler.com/static/media/scuoler_logo.3a634752982670eac2eb8b3981a0c162.svg";
        if (quizArr[0].thumbnail)
            thumbnailUrl = convertToAbsoluteUrl(quizArr[0].thumbnail);

        let res: any;
        res = await createLinkedInShare(linkedInAccessToken, entityLocation, thumbnailUrl, quizArr[0].name, text);
        console.log(res);
        res = await setLinkedSentTimestamp('quiz', quizArr[0]?.id)
        console.log(res);
    }
}

const createLinkedInShareForProblem: (linkedInAccessToken: string) => void = async (linkedInAccessToken: string) => {
    let problemArr: any[] = await getRandomProblem();
    if (problemArr.length > 0) {
        const entityLocation: string = `https://${constants.LETSENCRYPT_DOMAIN_NAME}/problemShowSelected/${problemArr[0].id}`;
        const categories: string[] = problemArr[0].categories;
        const options: string[] = problemArr[0]?.options;
        const description: string = problemArr[0].description.replace(/<[^>]*>?/gm, '');
        //problemArr[0].description.replace(/<(\/)?[^>]+(>|$)/g, "");
        const text: string =
            `Refresh and test your knowledge ` +
            ((categories.length >= 0) ? `in area(s): ${categories.join(", ")},` : ``) +
            ` by solving the following problem:\n ${description} ` +
            ((options.length > 0) ? `\nOptions: \n${options.reduce((accumulator, val, index) => {
                return accumulator + '\n' + (index + 1) + ')' + val;
            }, '')
                }\n` : ``) +
            `on https://${constants.LETSENCRYPT_DOMAIN_NAME} platform. ` +
            (problemArr[0].source ? ` Author: ${problemArr[0].source} ` : ``) +
            `, Browse and solve more problems at https://${constants.LETSENCRYPT_DOMAIN_NAME}/problemsBrowse and upskill your knowledge.`;

        const thumbnailUrl: string = '';
        const name: string = 'Scuoler Problem Challenge';
        let res: any;
        res = await createLinkedInShare(linkedInAccessToken, entityLocation, thumbnailUrl, name, text);
        console.log(res);
        res = await setLinkedSentTimestamp('problem', problemArr[0]?.id)
        console.log(res);
    }
}

const main = async () => {
    const linkedInAccessToken = await getLinkedInAccessToken();
    if (linkedInAccessToken) {
        await createLinkedInShareForCourse(linkedInAccessToken)
        await createLinkedInShareForQuiz(linkedInAccessToken);
        await createLinkedInShareForProblem(linkedInAccessToken);
    }

};

main();