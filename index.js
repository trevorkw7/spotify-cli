#!/usr/bin/env node

import chalk from "chalk";
import inquirer from "inquirer";
import terminalImage from "terminal-image";
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
const resetConfig = async () => {
    SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET = undefined;
    initSpotifyApi();
};

const setAccessToken = async (spotifyApi) => {
    let credentialResponse = await spotifyApi.clientCredentialsGrant();
    // console.log(credentialResponse.body['access_token']);
    spotifyApi.setAccessToken(credentialResponse.body['access_token']);
    

}


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

    let searchResult = null;
    let searchListings = null;

    const searchSpinner = createSpinner(`${gradient.rainbow(`Searching for ${name}...`)}`).start();

    switch (type) {
        case "track":
            searchResult = await spotifyApi.searchTracks(name);
            searchListings = searchResult.body.tracks.items;
            break;
        case "artist":
            searchResult = await spotifyApi.searchArtists(name);
            searchListings = searchResult.body.artists.items;
            break;
        case "playlist":
            searchResult = await spotifyApi.searchPlaylists(name);
            searchListings = searchResult.body.playlists.items;
            break;
        default:
            searchResult = await spotifyApi.searchTracks(name);
            searchListings = searchResult.body.tracks.items;
            break; 
    }

    if (searchListings.length > 1) {
        searchSpinner.success();
        // make array of top 5 search results
        const trackNames = searchListings.map(track => track.name).slice(0,6);

        // show search results and ask user to select one
        const selectedTrack = await inquirer.prompt({
            name: "track",
            type: "list",
            message: `Which ${type} do you want to play?`,
            choices: trackNames
        });

        let selectedIndex = (trackNames.indexOf(selectedTrack.track));
        let result = searchListings[selectedIndex];

        playSpinner.update({text: `Playing ${result.name} ${result.artists ? `by ${result.artists[0].name}` : ""}`});
        playSpinner.start();

        await spotifyMacClient.playTrack(result.uri) 

        playSpinner.success();
    } else if (searchListings.length == 1) {
        searchSpinner.success();
        let result = searchListings[0];

        playSpinner.update({text: `Playing ${result.name} ${result.artists ? `by ${result.artists[0].name}` : ""}`});
        playSpinner.start();

        await spotifyMacClient.playTrack(result.uri)  

        playSpinner.success();
    } else {
        searchSpinner.error();
        console.log(chalk.red("Result not found!")); 
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
    const setVolumeSpinner = createSpinner(`Setting ${gradient.atlas(`volume`)} to ${chalk.cyan( `${volume}`)}`).start();
    await sleep(100);
    await spotifyMacClient.setVolume(volume);
    setVolumeSpinner.success();
};

const getStatus = async () => {
    let status;
    let trackLength;
    let trackPosition;
 
    await spotifyMacClient.getTrack(async (err, track) => {
        await spotifyMacClient.getState(async (err, state) => {
            // capitalize state.state
            state.state = state.state.charAt(0).toUpperCase() + state.state.slice(1);
            status = chalkAnimation.neon(`${state.state + ": " + track.name + " by " + track.artist} from ${track.album}`, 1.8);
            // convert progress from seconds to ms
            state.position *= 1000;
            await sleep(1000);
            let progresBar = chalkAnimation.rainbow(generateProgressBar(state.position, track.duration), 0.5);
            await sleep(1000);
            progresBar.stop()
        });
    });

}

const about = async () => {
    console.log(chalk.blue(`Yeah so this CLI was developed by this random kid called ${chalk.cyan(`@trevorkw7`)}`));
    await sleep(1000);
    console.log(chalk.blue(`It's pretty cool, right?`));
    await sleep(1000);
    console.log(chalk.blue(`If you have any questions, feel free to get in touch through the GitHub repo`));
    await sleep(1000);
    const githubPrompt = await inquirer.prompt({
        name: "sendToGithub",
        type: "confirm",
        message: "Speaking of GitHub, wanna check it out 👀?",
        default: true
    });
    if (githubPrompt.sendToGithub) {
        const spinner = createSpinner('Opening GitHub...').start();
        await sleep(2000);
        await open("https://github.com/trevorkw7/Spotify-CLI");
        spinner.success();
    } else {
        console.log ("Ok, maybe next time!");
    }
};


const msToMinAndSec = (ms) => {
    var minutes = Math.floor(ms / 60000);
    var seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

const generateProgressBar = (progress, length) => {
    const barLength = 30;
    let leftTicks = (progress / length) * barLength;
    let rightTicks = barLength - leftTicks;
    let progressBar = `${(msToMinAndSec(progress))} [${'='.repeat(leftTicks)}⚪️${'-'.repeat(rightTicks)}] ${msToMinAndSec(length)}`;
    return progressBar;
}

 

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


program.command('configure').action(async () => {resetConfig()});
program.command('status').action(async () => {getStatus()});
program.command('about').action(async () => {about()});
    

program.parse(process.argv);









