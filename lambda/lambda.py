import boto3

aws_comprehend = boto3.client("comprehend")
aws_translate = boto3.client("translate")
aws_polly = boto3.client("polly")
aws_lex = boto3.client("lex-runtime")


def translate_text(text: str, fromLanguage: str, toLangugae: str):
    translated_text = aws_translate.translate_text(
        Text=text, SourceLanguageCode=fromLanguage, TargetLanguageCode=toLangugae
    )
    return translated_text


def get_sentiment(text: str):
    trans_response = translate_text(text, 'auto', 'en')
    text = trans_response['TranslatedText']
    sentiment = aws_comprehend.detect_sentiment(Text=text, LanguageCode="en")
    return sentiment


polly_voices = {
    "ar": ["standard", "arb", "Zeina"],
    "zh": ["standard", "cmn-CN", "Zhiyu"],
    "da": ["standard", "da-DK", "Mads"],
    "nl": ["standard", "nl-NL", "Ruben"],
    "en": ["neural", "en-US", "Matthew"],
    "fr": ["neural", "fr-FR", "Lea"],
    "de": ["neural", "de-DE", "Vicki"],
    "hi": ["standard", "hi-IN", "Aditi"],
    "is": ["standard", "is-IS", "Karl"],
    "it": ["neural", "it-IT", "Bianca"],
    "ja": ["neural", "ja-JP", "Takumi"],
    "ko": ["neural", "ko-KR", "Seoyeon"],
    "no": ["standard", "nb-NO", "Liv"],
    "pl": ["standard", "pl-PL", "Jan"],
    "pt": ["neural", "pt-BR", "Camila"],
    "ro": ["standard", "ro-RO", "Carmen"],
    "ru": ["standard", "ru-RU", "Maxim"],
    "es": ["neural", "es-ES", "Lucia"],
    "sv": ["standard", "sv-SE", "Astrid"],
    "tr": ["standard", "tr-TR", "Filiz"],
    "cy": ["standard", "cy-DB", "Gwyneth"]
}


def get_audio_file(text: str):
    lang = aws_comprehend.detect_dominant_language(
        Text=text)['Languages'][0]['LanguageCode']
    if lang not in polly_voices:
        raise Exception(f'{lang} not available for Amazon Polly')
    audio = aws_polly.synthesize_speech(
        Engine=polly_voices[lang][0],
        LanguageCode=polly_voices[lang][1],
        Text=text,
        OutputFormat="mp3",
        VoiceId=polly_voices[lang][2]
    )
    audio["AudioStream"] = list(audio["AudioStream"].read())
    return audio


def get_chat_response(text: str, username: str):
    chat_response = aws_lex.post_text(
        botName="ECOM_CHATBOT", botAlias="ECOM_CHATBOT_ALIAS", userId=username, inputText=text
    )
    return chat_response


# Lambda Handler Function
def lambda_handler(event, context):
    body = event
    response = None
    service = body["SERVICE"]
    payload = body["PAYLOAD"]
    try:
        if service == "TRANSLATE":
            response = translate_text(
                payload["text"], payload["from"], payload["to"])
            response["response"] = "ok"
        elif service == "POLLY":
            response = get_audio_file(payload["text"])
            response["response"] = "ok"
        elif service == "COMPREHEND":
            response = get_sentiment(payload["text"])
            response["response"] = "ok"
        elif service == "LEX":
            response = get_chat_response(payload["text"], payload["username"])
            response["response"] = "ok"
        else:
            response = {"response": "fail", 'error': 'INVALID Service'}
    except Exception as e:
        response = {'response': 'fail',
                    'error': e.__dict__['response']['Error']['Message'] if 'response' in e.__dict__ else str(e)}
    return response
