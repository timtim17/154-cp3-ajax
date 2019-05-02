/**
 * @author Austin Jenchi
 * CSE 154 AQ 19sp
 * @date 04/29/2019
 * Javascript for HeadlineTyper. Triggers CSS animation once the page is loaded using a class, uses
 * AJAX to fetch headlines from the News API. Times the user once they start the game and finds a
 * result of the user's speed.
 */
(function() {
    "use strict";

    const API_NEWS_BASEURL = "https://newsapi.org/v2/top-headlines";
    const API_NEWS_KEY = "747970caa23a46378e493a792866e791";
    const API_DOGS_BASEURL = "https://dog.ceo/api/breeds/image/random";
    /**
     * The country to fetch news for. Can be any country code supported by the News API.
     */
    const API_NEWS_COUNTRY = "us";
    const GAME_HEADLINES = 5;
    const GAME_TIME_INTERVAL = 100; // update the timer every x ms
    const GAME_TIME_STEP = GAME_TIME_INTERVAL / 1000;
    const HIDDEN_CLASS = "hidden";
    const DISPLAY_NONE_CLASS = "hidden-none";
    const REGEX_QUOTE = new RegExp("‘|’|“|”", "g");
    const REGEX_DASH = new RegExp("—|–", "g");
    const MUSIC = "audio/music.mp3";
    const AUDIO_FADE_RATE = 0.1;    // 10% every 100ms

    let allHeadlines = undefined;
    let picked = undefined; // headlines picked for the current game
    let timer = undefined;  // timer id
    let time = undefined;   // current time in seconds
    let curLine = undefined;
    let audio = undefined;

    window.addEventListener("load", onPageLoad);

    /**
     * Function to handle page load. Triggers CSS animations by adding a class and sets up event
     * listeners for the start game button.
     */
    function onPageLoad() {
        document.body.classList.add("anim-load");
        id("btn-start").addEventListener("click", onGameStart);
        let input = id("in-typer");
        input.addEventListener("input", onInputUpdate);
        input.addEventListener("paste", onInputPaste);
        fetchHeadlineData();
        id("btn-motivate").addEventListener("click", onMotivateClick);
        initAudio();
        let soundCheck = id("in-sound");
        soundCheck.addEventListener("change", () => {
            if (soundCheck.checked) {
                fadeAudio(1);
            } else {
                fadeAudio(0);
            }
        });
    }

    /**
     * Fetches headlines from the News API using AJAX and fetch. In the event of an error, an error
     * message is shown to explain as such. Otherwise, buttons is enabled, the game is ready to
     * and the headlines are returned in an array.
     */
    function fetchHeadlineData() {
        let url = `${API_NEWS_BASEURL}?country=${API_NEWS_COUNTRY}&apiKey=${API_NEWS_KEY}`;
        fetch(url)
            .then(checkStatus)
            .then(JSON.parse)
            .then(data => data.articles)
            .then(prepHeadlines)
            .catch(() => {
                document.body.appendChild(
                    document.createTextNode("Sorry, there was an issue getting the headlines. " +
                        "Try reloading?")
                );
            });
    }

    /**
     * Preps the retrieved headlines for the game. Grabs the headlines and saves them for game
     * generation, and populates the headline list on the game finish screen with links. Also
     * enables the start button.
     *
     * @param {object} data - The parsed JSON data from the News API
     */
    function prepHeadlines(data) {
        // replace special quotes while mapping headlines
        allHeadlines = data.map(article => article.title
            .replace(REGEX_QUOTE, "'")
            .replace(REGEX_DASH, "-"));
        let list = qs("#done ul");
        data.forEach(article => {
            let listItem = document.createElement("li");
            let link = document.createElement("a");
            link.href = article.url;
            link.innerText = article.title;
            link.target = "_blank";
            listItem.appendChild(link);
            list.appendChild(listItem);
        });
        id("btn-start").disabled = false;
    }

    /**
     * Starts the game when the start button is clicked. Uses the headlines retrieved to test the
     * user's typing. Starts a timer to see how fast they can type and track the accuracy of the
     * characters they type. This function assumes that the user cannot click the button till the
     * are loaded, so the AJAX call should have already happened.
     */
    function onGameStart() {
        hideElement("pregame");
        hideElement("done");
        picked = [];
        while (picked.length < GAME_HEADLINES) {
            let pick = allHeadlines[Math.floor(Math.random() * allHeadlines.length)];
            if (!picked.includes(pick)) {
                picked.push(pick);
            }
        }
        time = 0;
        nextHeadline();
        // account for time out
        // anonymous function for the timeout, though it's still a part of the game start procedure
        setTimeout(() => {
            timer = setInterval(updateTimer, GAME_TIME_INTERVAL);
            showElement("game");
            id("in-typer").focus(); // put focus on the input so the user can start typing
        }, 1000);
        if (audio.paused && id("in-sound").checked) {
            audio.play();
        }
    }

    /**
     * Picks the next headline from the pick list and updates the page respectively. If there are
     * no more headlines, triggers the game over event.
     */
    function nextHeadline() {
        if (picked.length === 0) {
            onGameOver();
        } else {
            curLine = picked.pop();
            curLine = curLine.substring(0, curLine.lastIndexOf(" - "));
            id("prompt").innerText = curLine;
            id("in-typer").value = "";
            // indicators for completed lines
            let numFilled = GAME_HEADLINES - picked.length - 1;
            id("complete").innerText = "◉".repeat(numFilled) +
                "◎".repeat(GAME_HEADLINES - numFilled);
        }
    }

    /**
     * Runs every time something is typed in the text box. Checks how much of what the user has
     * typed matches the actual line, and updates the line displayed on the DOM, with what hs been
     * typed in bold. If the line is complete, trigger the next line.
     */
    function onInputUpdate() {
        let parent = id("prompt");
        parent.innerHTML = "";
        let typed = id("in-typer").value;
        let i = 0;
        while (i < Math.max(typed.length, curLine.length) && typed[i] === curLine[i]) {
            i++;
        }
        if (i === curLine.length) {
            nextHeadline();
        } else {
            let typedEle = document.createElement("span");
            typedEle.innerText = curLine.substring(0, i);
            parent.appendChild(typedEle);
            parent.append(document.createTextNode(curLine.substring(i)));
        }
    }

    /**
     * On a paste event, disable the input for 2 seconds with a warning against copy + paste.
     */
    function onInputPaste() {
        let input = id("in-typer");
        let curVal = input.value;
        input.value = "No copy + paste >:[";
        input.disabled = true;
        setTimeout(() => {
            input.value = curVal;
            input.disabled =  false;
            input.focus();
        }, 2000);
    }

    /**
     * Once the game is over, fade out the game and fade in the done screen. Also shows the time
     * the player took.
     */
    function onGameOver() {
        clearInterval(timer);
        hideElement("game");
        let timeStr = time.toString();
        id("done-time").innerText = timeStr.substring(0, timeStr.indexOf(".") + 2) + " seconds";
        setTimeout(() => {
            showElement("done");
            showElement("pregame");
        }, 1000);
    }

    /**
     * Updates the game timer. Every time this method is called it is expected that another time
     * interval has passed It is also expected that the timer is running, and this is being called
     * by that interval. Updates the DOM element representing the timer as well.
     */
    function updateTimer() {
        time += GAME_TIME_STEP;
        let timeStr = time.toString();
        id("time").innerText = timeStr.substring(0, timeStr.indexOf(".") + 2) + " seconds";
    }

    /**
     * Runs when the motivate button is clicked. Starts the timer of dogs.
     */
    function onMotivateClick() {
        // `this` is the motivate button
        this.classList.add("hidden");
        qsa(".decor-fire").forEach(fire => hideElement(fire));
        let fireDogCopyright = qs("footer p:nth-child(3)");
        fireDogCopyright.innerText = "Dog images from the ";
        let dogLink = document.createElement("a");
        dogLink.href = "https://dog.ceo/dog-api/";
        dogLink.innerText = "Dog API";
        fireDogCopyright.appendChild(dogLink);
        motivation();
    }

    /**
     * Does some super secret motivation techniques with the Dogs API.
     *
     * Every so often, fetches a dog image from the API and animates it up the page.
     */
    function motivation() {
        setTimeout(() => {
            fetch(API_DOGS_BASEURL)
                .then(checkStatus)
                .then(JSON.parse)
                .then(resp => resp.message)
                .then(url => {
                    let dogImg = document.createElement("img");
                    dogImg.src = url;
                    dogImg.alt = "A cute dog";
                    dogImg.classList.add("dog");
                    if (Math.random() < 0.5) {
                        dogImg.classList.add("dog-right");
                    }
                    document.body.appendChild(dogImg);
                    setTimeout(() => {
                        dogImg.remove();
                    }, 10000);
                }); // no catch -- this is an optional feature, i don't care if there's an error
            motivation();
        }, Math.max(5000, Math.random() * 10000));
    }

    /**
     * Helper to fade out an element. Adds a class to change the opacity to fade it out, then a
     * second later (animation time) add another to remove it from the page flow.
     *
     * @param {HTMLElement|string} ele - The element or the id of element to fade out
     */
    function hideElement(ele) {
        if (typeof(ele) === "string") {
            // element id
            ele = id(ele);
        }
        ele.classList.add(HIDDEN_CLASS);
        // give a little extra time for the animation to finish
        setTimeout(() => {
            ele.classList.add(DISPLAY_NONE_CLASS);
        }, 1000);
    }

    /**
     * Helper to fade in an element. Removes both hidden classes so that the element's opacity fades
     * in and is also added to page flow.
     *
     * @param {HTMLElement|string} ele - The element or the id of the element to fade back in
     */
    function showElement(ele) {
        if (typeof(ele) === "string") {
            // element id
            ele = id(ele);
        }
        ele.classList.remove(DISPLAY_NONE_CLASS);
        // a little bit of delay for the animation
        setTimeout(() => {
            ele.classList.remove(HIDDEN_CLASS);
        }, 10);
    }

    /**
     * Initialize the Audio and queue up the music, if the browser supports it.
     */
    function initAudio() {
        if (Audio) {    // check for global audio
            audio = new Audio(MUSIC);
        } else {
            audio = document.createElement("audio");
            audio.src = MUSIC;
        }
        audio.loop = true;
    }

    /**
     * Fades the audio volume to the given level. Assumes the audio is already playing.
     *
     * @param {number} newVolume - The new volume level to fade to, [0.0, 1.0]
     */
    function fadeAudio(newVolume) {
        let interval = setInterval(() => {
            if (audio.volume === newVolume) {
                clearInterval(interval);
            } else if (audio.volume < newVolume) {
                audio.volume += Math.min(newVolume - audio.volume, AUDIO_FADE_RATE);
            } else {
                audio.volume += Math.max(-audio.volume - newVolume, -AUDIO_FADE_RATE);
            }
        }, 100);
    }

    /* CSE 154 HELPER FUNCTIONS */

    /**
     * Returns the DOM element with the given id.
     *
     * @param {string} idName - The id to search for
     * @returns {HTMLElement} The element with that id
     */
    function id(idName) {
        return document.getElementById(idName);
    }

    /**
     * Returns the first element in the DOM tree that matches the given selector.
     *
     * @param {string} selector - The selector to search with
     * @returns {HTMLElement} The first element in the DOM that matches that selector
     */
    function qs(selector) {
        return document.querySelector(selector);
    }

    /**
     * Helper function to return the response's result text if successful, otherwise
     * returns the rejected Promise result with an error status and corresponding text
     *
     * @param {object} response - response to check for success/error
     * @returns {object} - valid result text if response was successful, otherwise rejected
     *                     Promise result
     */
    function checkStatus(response) {
        if (response.status >= 200 && response.status < 300) {
            return response.text();
        } else {
            return Promise.reject(new Error(response.status + ": " + response.statusText));
        }
    }

    /**
     * Returns all the elements in the DOM that match the given selector.
     *
     * @param {string} selector - The selector to search with
     * @returns {HTMLElement[]} All elements in the DOM that match that selector
     */
    function qsa(selector) {
        return document.querySelectorAll(selector);
    }
})();
