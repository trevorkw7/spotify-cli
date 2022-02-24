#!/usr/bin/env node

import chalk from "chalk";
import inquirer from "inquirer";
import gradient from "gradient-string";
import chalkAnimation from "chalk-animation";
import nconf from "nconf";
import SpotifyWebApi from "spotify-web-api-node"
import open from "open";
import { createSpinner } from "nanospinner";
import path from "path";
import os from "os";
import spotifyMacClient from "spotify-node-applescript";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Command } = require('commander');
const program = new Command();


// setup nconf for storing and retrieving keys
const CONFIG_PATH = path.join(os.homedir(),'/.spotify-cli-config.json');
nconf.env().file(CONFIG_PATH);

let spotifyApi = null;
let SPOTIFY_CLIENT_ID = nconf.get("SPOTIFY_CLIENT_ID");
let SPOTIFY_CLIENT_SECRET = nconf.get("SPOTIFY_CLIENT_SECRET");

const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)) };

const setKeys = async () => {
    const setKeysTitle = chalkAnimation.rainbow("It's time to set your Spotify keys! \n");
    await sleep(2000);
    setKeysTitle.stop();
    const websitePrompt = await inquirer.prompt({
        name: "sendToWebsite",
        type: "confirm",
        message: "Do you want to go to the Spotify developer website get an api key?",
        default: true
    });
    if (websitePrompt.sendToWebsite) {
        const spinner = createSpinner('Opening Spotify developer website...').start();
        await sleep(2000);
        await open("https://developer.spotify.com/dashboard/applications");
        spinner.success();
    }

    const clientIdPrompt = await inquirer.prompt({
        name: "clientId",
        type: "input",
        message: "What is your Spotify client ID? 🎫",
        default: SPOTIFY_CLIENT_ID
    });

    SPOTIFY_CLIENT_ID = clientIdPrompt.clientId;
    nconf.set("SPOTIFY_CLIENT_ID", SPOTIFY_CLIENT_ID);
    nconf.save();

    const clientSecretPrompt = await inquirer.prompt({
        name: "clientSecret",
        type: "input",
        message: "What is your Spotify client secret? 🔑",
        default: SPOTIFY_CLIENT_SECRET
    });

    SPOTIFY_CLIENT_SECRET = clientSecretPrompt.clientSecret;
    nconf.set("SPOTIFY_CLIENT_SECRET", SPOTIFY_CLIENT_SECRET);
    nconf.save();
};

const initSpotifyApi = async () => {
    if (SPOTIFY_CLIENT_ID == undefined || SPOTIFY_CLIENT_SECRET == undefined) {
        await setKeys();
    }

    return new SpotifyWebApi({
        clientId: SPOTIFY_CLIENT_ID,
        clientSecret: SPOTIFY_CLIENT_SECRET,
    });
};

const setAccessToken = async (spotifyApi) => {
    let credentialResponse = await spotifyApi.clientCredentialsGrant();
    // console.log(credentialResponse.body['access_token']);
    spotifyApi.setAccessToken(credentialResponse.body['access_token']);
    

}
const showCurrentTrack = async (spotifyApi) => {

};

const play = async (type,name) => {

    const playSpinner = createSpinner('Playing...');
    // if no name is provided, play the current track and exit
    if (!name) {
        playSpinner.start();
        await sleep(100);
        await spotifyMacClient.play();
        playSpinner.success();
        return;
    } 

    let results = null;
    let result = null;

    const searchSpinner = createSpinner(`${gradient.rainbow(`Searching for ${name}...`)}`).start();
    await sleep(100);

    switch (type) {
        case "track":
            results = await spotifyApi.searchTracks(name);
            result = results.body.tracks.items[0];
            break;
        case "artist":
            results = await spotifyApi.searchArtists(name);
            result = results.body.artists.items[0];
            break;
        case "playlists":
            results = await spotifyApi.searchPlaylists(name);
            result = results.body.playlists.items[0];
            break;
        default:
            results = await spotifyApi.searchTracks(name);
            result = results.body.tracks.items[0];
            break; 
    }


    if(result) {
        searchSpinner.success();
        playSpinner.update({text: `Playing ${result.name} ${result.artists ? `by ${result.artists[0].name}` : ""}`});
        playSpinner.start();
        await sleep(100);
        await spotifyMacClient.playTrack(result.uri);
        playSpinner.success();
    } else {
        searchSpinner.fail();
        console.log(chalk.red("Track not found!"));
    }

};

const playTrack = async (name) => {
    if (name) {
        const searchSpinner = createSpinner(`Searching for ${name}...`).start();
        await sleep(100);
        let result = await spotifyApi.searchTracks(name);
        console.log(result.body.tracks.items[0]);
        searchSpinner.success();
    } 
}; 

const pause = async () => {
    const pauseSpinner = createSpinner('Pausing...').start();
    await sleep(100);
    await spotifyMacClient.pause();
    pauseSpinner.success();
};

const next = async () => {
    const nextSpinner = createSpinner('Next...').start();
    await sleep(100);
    await spotifyMacClient.next();
    nextSpinner.success();
};

const previous = async () => {
    const previousSpinner = createSpinner('Previous...').start();
    await sleep(100);
    await spotifyMacClient.previous();
    previousSpinner.success();
};

const volumeUp = async () => {
    const volumeUpSpinner = createSpinner('Volume up...').start();
    await sleep(100);
    await spotifyMacClient.volumeUp();
    volumeUpSpinner.success();
};

const volumeDown = async () => {
    const volumeDownSpinner = createSpinner('Volume down...').start();
    await sleep(100);
    await spotifyMacClient.volumeDown();
    volumeDownSpinner.success();
};

const setVolume = async (volume) => {
    const setVolumeSpinner = createSpinner(`Setting volume to ${volume}`).start();
    await sleep(100);
    await spotifyMacClient.setVolume(volume);
    setVolumeSpinner.success();
};

 

// init spotify api
spotifyApi = await initSpotifyApi();

// set an access token
await setAccessToken(spotifyApi);
await spotifyMacClient.unmuteVolume();

// map commands to functions;
const playCommand = program.command('play [type] [name]')
playCommand.description('play current song / play a specific [track] or [artist] or [playlist]');
playCommand.action(async (type, name) => {play(type, name)});

program.command('pause').action((async () => {pause()}));
program.command('next').action((async () => {next()}));
program.command('prev').action((async () => {previous()}));
program.command('volumeUp').action((async () => {volumeUp()}));
program.command('volumeDown').action((async () => {volumeDown()}));
program.command('volume')
    .argument('<volume>')
    .action((volume) => {setVolume(volume)});

    

program.parse(process.argv);









