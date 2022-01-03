from flask import Flask, render_template, request
import os
import boto3


app = Flask(__name__)


boto3 = boto3.Session(
    aws_access_key_id=os.getenv("ACC_KEY"),
    aws_secret_access_key=os.getenv("SEC_KEY"),
    aws_session_token=os.getenv("SES_TOK"),
    region_name="us-east-1",
)

lambda_function = boto3.client("lambda")

@app.route("/")
def home():
    print(app.config)
    return render_template('index.html')


@app.route("/lambda", methods=["POST"])
def apiroute():
    body = request.data
    response = None
    try:
        response = lambda_function.invoke(
            FunctionName="FinalProject",
            InvocationType="RequestResponse",
            Payload=body
        )
        response = response['Payload'].read()
    except Exception as e:
        response = {'response': 'fail',
                    'error': e.__dict__['response']['Error']['Message']}
    return response


if __name__ == "__main__":
    app.run()