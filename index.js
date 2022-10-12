import cheerio from 'cheerio';
import axios from 'axios';
import * as fs from 'fs';

const allReleaseApi = axios.create({
    baseURL: 'https://www.criterion.com/shop/browse/list?sort=spine_number&format=blu-ray',
});

const collectionApi = axios.create({
    baseURL: 'https://www.criterion.com/collection/156927',
});

const wishlistApi = axios.create({
    baseURL: 'https://www.criterion.com/wishlist/156926',
});

async function stripReleases() {
    let releases = [];
    const response = await allReleaseApi.get();
    const $ = cheerio.load(response.data);
    $('.gridFilm').each((i, el) => {
        releases.push({
            title: $('.g-title', el).text().replace(/\n/g, ''),
            director: $('.g-director', el).text().trim().replace(/\n/g, ''),
            link: $(el).attr('data-href'),
        })
    });
    return releases;
}

async function stripCollection() {
    let collection = [];
    const response = await collectionApi.get();
    const $ = cheerio.load(response.data);
    $('.filmWrap').each((i, el) => {
        if($(el).find('dd').eq(1).text() !== 'DVD') {
            collection.push({
                title: $(el).find('dt').text().replace(/\n/g, ''),
                director: $(el).find('dd').text().replace(/\n/g, '').replace(/DVD/g, '').replace(/Blu-ray/g, '').replace(/\/ Combo/g, '').replace(/Collector’s Set/g, ''),
                link: $('a', el).attr('href')
            });
        }
    });
    return collection;
}

async function stripWishlist() {
    let wishlist = [];
    const response = await wishlistApi.get();
    const $ = cheerio.load(response.data);
    $('.wishlist-item').each((i, el) => {
        wishlist.push({
            title: $('.wl-title', el).text().replace(/\n/g, ''),
            link: $('.wl-title', el).find('a').attr('href'),
        })
    });
    return wishlist;
}

async function compareReleasesWithCollection() {
    const collection = await stripCollection();
    const releases = await stripReleases();
    const combinedArray = [...collection, ...releases].sort((a, b) => a.title > b.title ? 1 : -1);
    let doNotHaves = [];

    for(let i = 0; i < combinedArray.length; i++) {
        const currentObject = combinedArray[i];
        const nextObject = combinedArray[i + 1] ? combinedArray[i + 1] : null;
        if(nextObject && currentObject.title === nextObject.title && currentObject.link === nextObject.link) {
            i++;
        } else doNotHaves.push(currentObject);
    }

    return doNotHaves;
}

async function writeToFile() {
    const results = await compareReleasesWithCollection();
    const wishlist = await stripWishlist();
    const resultString = results.map((result) => {
        return `${result.title} ${result.director && '- ' + result.director + ' '}- ${result.link} ${wishlist.find((element) => 
            element.title === result.title && element.link === result.link) ? '(In Wishlist)' : ''}\n`
    });
    fs.writeFile('releases.txt', resultString.join(''), (err) => {
        if (err) console.log(err);
    });
}

writeToFile();