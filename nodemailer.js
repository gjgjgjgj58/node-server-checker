const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const nodemailer = require('nodemailer');
const {logger} = require('./winston');

// 메일 계정 정보
var id = "sukim91@ksic.net",
    password = "Horn!907";

var inputId = function (question) {
    return new Promise(function (resolve) {
        rl.question(question, function(line){
            id = line;
            console.log(id);
            rl.pause();
            resolve();
        });
    });
};

var inputPassword = function (question) {
    return new Promise(function (resolve) {
        rl.question(question, function(line){
            password = line;
            console.log(password);
            rl.close();
            resolve();
        });
    });
};

module.exports = function() {
    // 회사 계정이 abc.co.kr 이라고 가정

    // transporter 생성 (인증)
    var transporter = nodemailer.createTransport({

        // host: "mail.회사.계정.입력" *** mail.
        host: "gwm.bizmeka.com",

        // 보안 무시
        port: 587,

        // 회사 도메인 내 계정 및 비밀번호
        auth: {
            user: id,
            pass: password,
        },

        // 서명받지 않은 사이트의 요청도 받겠다.
        tls: {
            rejectUnauthorized: false
        }
    });
    return {
        input: async function() {
            //await inputId("Input id: ");
            //await inputPassword("Input password: ");
        },
        sendMail: function (sender, receivers, subject, text) {
            receivers.forEach(function(receiver){
                let mailOption = {
                    // 발송 메일 주소 (위에서 작성한 회사 계정 아이디)
                    from: sender,

                    // 수신 메일 주소
                    to: receiver,

                    // 제목
                    subject: subject,

                    // 인증 URL
                    text: text
                };

                transporter.sendMail(mailOption, (err, info) => {
                    if(err)
                        logger.error(err);
                    else
                        logger.info(info.response);
                });
            });
        }
    }
}();