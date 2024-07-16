import { Pool, QueryResult } from "pg";

const pg = require("pg");
const fs = require("fs").promises;
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

const getRandomCourse: () => Promise<any> = () => {
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

const setLinkedSentTimestampForCourse = (courseId: string) => {
    const pool: Pool = getPool();
    let sql: string = `
     update course set linkedin_sent_timestamp=now(), modified_timestamp=now()
      where id=$1
    `;
    return new Promise((resolve, reject) => {
        pool.query(sql, [courseId], function (err: Error, result: QueryResult) {
            pool.end(() => { });
            if (err) {
                reject(err);
            } else {
                resolve("course linkedin sent timestamp updated");
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

const createLinkedInShare: (courseObj: any) => void = async (courseObj: any) => {
    const data: string = await fs.readFile(getAccessTokenPath(), "utf8");
    const { linkedInAccessToken }: any = JSON.parse(data);
    console.log(linkedInAccessToken);

    if (linkedInAccessToken) {
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
                        entityLocation: `https://scuoler.com/courseShowSelected/${courseObj.id}`,
                        thumbnails: [
                            {
                                resolvedUrl: courseObj.thumbnail,
                            },
                        ],
                    },
                ],
                title: courseObj.name,
            },
            distribution: {
                linkedInDistributionTarget: {},
            },
            owner: `urn:li:person:${getPersonId()}`,
            //owner: `urn:li:organization:86017971`,
            subject:
                `Upskill yourself with the new course titled '${courseObj.name}' on https://scuoler.com platform. ` +
                `Browse more courses at https://scuoler.com/coursesBrowse and start your personal learning experience.`,
            text: {
                text:
                    `Upskill yourself with the new course titled '${courseObj.name}' on https://scuoler.com platform. ` +
                    `Browse more courses at https://scuoler.com/coursesBrowse and start your learning experience.`,
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
    }
};

const main: () => void = async () => {
    let courseArr: any[] = await getRandomCourse();
    if (courseArr.length > 0) {
        let res: any;
        res = await createLinkedInShare(courseArr[0]);
        console.log(res);
        res = await setLinkedSentTimestampForCourse(courseArr[0]?.id)
        console.log(res);
    }
};

main();
