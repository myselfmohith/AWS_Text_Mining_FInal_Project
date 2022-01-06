const username = Math.random().toString(36);
const translate_submit = document.getElementById("translate-arrow");
const sentiment_submit = document.getElementById("sentiment-arrow");
const tts_submit = document.getElementById("tts-arrow");

const postRequest = (apibody) => fetch('/lambda', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(apibody)
})
    .then(res => res.json());

function disableIcon(element) {
    element.src = "/static/svg/Rhombus.gif"
    element.style.pointerEvents = 'none';
}

function enableIcon(element) {
    element.src = "/static/svg/Arrow.svg"
    element.style.pointerEvents = 'unset';
}


// ! Translate ----------------------------------------------------
translate_submit.addEventListener('click', () => {
    const from = document.getElementById("from-langauge").value;
    const to = document.getElementById("to-langauge").value;
    const text = document.getElementById("from-language-textarea").value;
    if (text === "" | to === from) return;
    const apibody = {
        SERVICE: 'TRANSLATE',
        PAYLOAD: {
            text, from, to
        }
    }

    disableIcon(translate_submit);
    postRequest(apibody)
        .then(res => {
            if (res.response !== "ok") throw { "message": res.error };
            document.getElementById("to-language-textarea").value = res.TranslatedText;
            document.getElementById("from-langauge").value = res.SourceLanguageCode;
            enableIcon(translate_submit);
        })
        .catch(err => {
            alert(`⚠️ - ${err.message}`);
            enableIcon(translate_submit);
        })
})


// ! SENTIMENT ----------------------------------------------------
const sentiment_colors = {
    "POSITIVE": "#10BA5C",
    "NEUTRAL": "#FEAC00",
    "NEGATIVE": "#FA586C",
    "MIXED": "#41A1F0"
}
sentiment_submit.addEventListener('click', () => {
    const text = document.getElementById("sentiment-input").value;
    if (text === "") return;
    const apibody = {
        SERVICE: 'COMPREHEND',
        PAYLOAD: {
            text
        }
    }
    disableIcon(sentiment_submit);
    postRequest(apibody)
        .then(res => {
            if (res.response !== "ok") throw { "message": res.error };
            const sentiment = res.Sentiment;
            const percent = Math.round(res.SentimentScore[sentiment.charAt(0) + sentiment.toLowerCase().slice(1)] * 100);
            document.getElementById('sentiment-percent').textContent = `${sentiment} - ${percent}%`;
            document.getElementById('sentiment-percent').style.color = sentiment_colors[sentiment];

            document.querySelector("#emoji-container > svg > circle").style.stroke = sentiment_colors[sentiment];
            document.getElementById('sentiment-emotion').src = `/static/svg/${sentiment}.svg`;
            document.querySelector("#emoji-container > svg > circle").style.strokeDashoffset = 378 - 378 * (percent / 100);

            enableIcon(sentiment_submit);
        })
        .catch(err => {
            alert(`⚠️ - ${err.message}`);
            enableIcon(sentiment_submit);
        })
})

// !TTS ----------------------------------------------------
const audio_icon = document.querySelector("#tts-results svg path");
tts_submit.addEventListener('click', () => {
    const text = document.getElementById("tts-input").value;
    if (text === "") return;
    const apibody = {
        SERVICE: 'POLLY',
        PAYLOAD: {
            text
        }
    }

    disableIcon(tts_submit);
    postRequest(apibody)
        .then(res => {
            if (res.response !== "ok") throw { "message": res.error };
            const audioarr = new Uint8Array(res.AudioStream);
            const audioblob = new Blob([audioarr], { type: res.ContentType });
            document.getElementById('tts-audio').src = URL.createObjectURL(audioblob);
            audio_icon.setAttribute('fill', '#f66700')
            document.getElementById('tts-audio').play()
            enableIcon(tts_submit);
        })
        .catch(err => {
            alert(`⚠️ - ${err.message}`);
            enableIcon(tts_submit);
        })
})

document.getElementById('tts-audio').addEventListener('ended', () => audio_icon.setAttribute('fill', '#5f6368'));

document.getElementById('tts-results').addEventListener('click', () => {
    const audio = document.getElementById('tts-audio');
    if (audio.currentSrc == '') return;
    if (audio.paused) {
        audio.play();
        audio_icon.setAttribute('fill', '#f66700');
    }
    else {
        audio.pause();
        audio_icon.setAttribute('fill', '#5f6368');
    }
})


// ! ChatBot ----------------------------------------------------
function appendToChat(text, isbot) {
    const chatsUL = document.getElementById('chats-data');
    const dummy = document.getElementById('dummy-view');
    const li = document.createElement('li');
    li.innerHTML = text;
    li.classList.add('message-item');
    li.classList.add(isbot ? 'bot' : 'me');
    chatsUL.insertBefore(li, dummy);
    dummy.scrollIntoView({ behavior: 'smooth' });
}


function notLexService(text) {
    const arr = text.replace("!", "").split(" ");
    switch (arr[0]) {
        case "translate":
            postRequest({
                SERVICE: 'TRANSLATE',
                PAYLOAD: {
                    text: arr.splice(3,).join(" "),
                    from: arr[1],
                    to: arr[2]
                }
            }).then(res => {
                if (res.response !== "ok") throw { "message": res.error };
                appendToChat(res.TranslatedText, true);
            }).catch(err => appendToChat(`${err.message} <br /> <em>Check for the language codes in translate section</em>`, true));
            break;
        case "sentiment":
            postRequest({
                SERVICE: 'COMPREHEND',
                PAYLOAD: { text: arr.splice(1,).join(" ") }
            }).then(res => {
                if (res.response !== "ok") throw { "message": res.error };
                appendToChat(`${res.Sentiment} ${Math.round(res.SentimentScore[res.Sentiment.charAt(0) + res.Sentiment.toLowerCase().slice(1)] * 100)}%.`, true);
            }).catch(err => appendToChat(`${err.message}`, true));
            break;
        default:
            appendToChat(` <p>Check Input,Try:</p><br /><p>><strong> !trans [from] [to] [text] </strong> </p><p>Ex: !trans en te Hey man hows Going on</p><br /><p>><strong> !sentiment [text] </strong></p><p>!sentiment this is good text</p>`, true)
    }
}

document.getElementById('send-message-container').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = e.target['send-message-input'].value;
    appendToChat(text, false);
    if (text.trim().startsWith("!")) return notLexService(text);
    const apibody = {
        SERVICE: 'LEX',
        PAYLOAD: {
            text, username
        }
    }
    e.target['send-message-input'].value = "";
    e.target['send-message-button'].setAttribute("disabled", "true");
    postRequest(apibody)
        .then(res => {
            if (res.response !== "ok") throw { "message": res.error };
            appendToChat(res.message, true);
            e.target['send-message-button'].removeAttribute('disabled');
        })
        .catch(err => {
            alert(`⚠️ - ${err.message}`);
            e.target['send-message-button'].removeAttribute('disabled');
        })
})