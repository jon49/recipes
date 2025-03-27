import { readFile, writeFile } from 'node:fs/promises';
import { access, constants } from 'node:fs';

let json = await readFile('meals.json', 'utf8')
let meals: Meal[] = JSON.parse(json);

let mealTimes = new Map<number, string>(
    [1616649174480, 1616365972715, 1616392653154, 1619328899490, 1616732828506, 1673554332578, 1620873845190, 1620858768728, 1661650296326, 1617738651918, 1619582837123, 1619838023019, 1620001794837, 1620432641713, 1700523495426, 1680051505047, 1678504622465, 1674150001688, 1672988701068, 1656284721819, 1642815314072, 1640561812663, 1629858992650, 1623034437695, 1625959035308, 1627768627493, 1628566978843, 1644298215029]
    .map(x => [x, 'dinner'] as [number, string])
    .concat([1616368685998, 1616432502304].map(x => [x, "dessert"]))
    .concat([1617073896338].map(x => [x, "breakfast"]))
);

let exitEarly = false;

let errors: string[] = []

let count = 0
for (let meal of meals) {
    count++;
    let filename = meal.Name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '.md';
    console.log(`Filename ${filename}`);

    let content = `---
title: ${meal.Name.trim()}
description: Recipe for ${meal.Name.trim()}.
tags:
${meal.MealTimes.map(x => {
    if (!mealTimes.has(x)) {
        errors.push(`Unknown meal type: ${x} for meal ${meal.Name}`);
        // Exit early
        exitEarly = true;
    }
    return `  - ${mealTimes.get(x)?.trim()}`
}).join('\n')}
categories:
  - recipe-reference
type: page
---

---

${
    meal.BookName
        ? `Source: ${meal.BookName.trim()}${meal.BookPage ? ' ' + meal.BookPage : ''}`
    : meal.Other
        ? `Source: ${meal.Other.trim()}`
    : meal.Url
        ? `Source: <${meal.Url.trim()}>`
    : ''
}`

    try {
        access(`./reference/${filename}`, constants.F_OK, e => {
            if (!e) {
                console.error(`File ${filename} already exists.`);
                // Exit early
                exitEarly = true;
            }
        });
        await writeFile(`./reference/${filename}`, content, 'utf8');
    } catch (e) {
        console.error(e);
    }
}

console.log(`${count} meals printed of total ${meals.length}.`);

if (exitEarly) {
    console.error(errors);
    process.exit(1);
}

interface Meal {
    MealTimes: number[];
    Name: string;
    BookName: string | null;
    BookPage: number;
    Other: string | null;
    Url: string | null;
}
