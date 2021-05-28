const {logger} = require('./winston');
const nodemailer = require('./nodemailer');
const {Mariadb} = require('./mariadb');
const cron = require('node-cron');
const ping = require('ping');
const xml2js = require('xml2js');

const http = require('http');
const https = require('https');

// host 정보 (ip : description)
var hosts = {
    '30.30.30.159':'159 Server PC',
    '147.46.40.211':'dev.ksic.net Domain'
};

// db 정보
var db = {
    init: function () {
        // maria
        Object.keys(this.maria).forEach(key => {
            db.maria[key].constructor = new Mariadb(db.maria[key].config);
        });
    },
    mysql: {},
    maria: {
        // 30.30.30.77 mysql(mariadb)
        '30.30.30.77': {
            // 30.30.30.77 mysql(mariadb) db_config
            config: {
                host: "30.30.30.77",
                port: 3306,
                user: "ksic_tracker",
                password: "devlab#1226",
                database: "coronadb2"
            }
        }
    },
    oracle: {}
};

// 메일 정보
var sender = "techsupport@ksic.net";
var receivers = ['sukim91@ksic.net', 'khy7206@ksic.net', 'psj1789@ksic.net'];
//var receivers = ['sukim91@ksic.net'];

var check_mailing = {};

var failCount = {};

function writeLog(module, msg) {
    logger.info(module.status + ": " + msg);
}

(function () {
    init();
})();

function init() {
    //db.init();
    setCron();
}

function setCron() {
    // 30분마다 요청
    cron.schedule('*/30 * * * *', () => {
        try {
            // 159 server
            mainServer.execute();
            // coronapath.info updater.js
            updater.execute();
            // kMap (async)
            //KMap.execute().then();
        } catch (e) {
            logger.error(e);
            // coronapath.info updater.js
            updater.sendMail(e);
        }
    });
}

var mainServer = {
    status: "159 server",
    failCount: (function () {
        Object.keys(hosts).forEach(ip => {
            failCount[ip] = 0;
        });
    })(),
    init: (function () {
        Object.keys(hosts).forEach(ip => {
            check_mailing[ip] = 0;
        });
    })(),
    execute: function () {
        // let failCount = this.failCount;

        Object.keys(hosts).forEach(ip => {
            let host = ip + ' (' + hosts[ip] + ')';

            ping.sys.probe(ip, function(isAlive){
                if (!isAlive) {
                    if (failCount[ip] <= 0) {
                        // try it once
                        let msg = 'Host ' + host + ' is dead. But I will try again!';
                        writeLog(mainServer, msg);
                        failCount[ip]++;

                    } else {
                        // mail send
                        let msg = 'Host ' + host + ' is dead. I will send mail everyone!';
                        mainServer.sendMail(ip);
                        writeLog(mainServer, msg);
                        failCount[ip] = 0;

                    }
                } else {
                    let msg = 'Host ' + host + ' is alive.';
                    writeLog(mainServer, msg);

                    check_mailing[ip] = 0;
                    failCount[ip] = 0;
                }
            });
        });
    },
    sendMail: function (ip) {
        if (check_mailing[mainServer.status] <= 0) {
            let host = ip + ' (' + hosts[ip] + ')';

            // 메일 제목
            let subject = host + ' 서버 확인 바랍니다.';
            // 메일 내용
            let text = host + ' Ping 요청 결과 응답을 받을 수 없습니다. \n\n' + hosts[ip] + ' 확인 바랍니다.';

            nodemailer.sendMail(sender, receivers, subject, text);

            check_mailing[ip] += 1;
        }
    }
};

var updater = {
    status: "coronapath.info updater.js",
    check_option: {
        hostname: '30.30.30.159',
        port: '3891',
        path: '/',
    },
    init: (function () {
        check_mailing["coronapath.info updater.js"] = 0;
    })(),
    execute: function () {
        let check_option = this.check_option;
        var request = http.get(check_option, function (res) {
            let msg = "statusCode: " + res.statusCode + ", status is ok.";
            writeLog(updater, msg);

            check_mailing[updater.status] = 0;
        });
        request.on('error', function (err) {
            let msg = "Error occurred! I will send mail everyone!";
            console.error(err);
            writeLog(updater, msg);
            updater.sendMail();
        });
        request.end();
    },
    sendMail: function (e) {
        if (check_mailing[updater.status] <= 0) {
            // 메일 제목
            let subject = 'coronapath.info updater.js 확인 바랍니다.';
            // 메일 내용
            let text = '요청 응답을 받을 수 없습니다. \n\n' + 'coronapath.info updater.js 확인 바랍니다.';

            if (e)
            {
                // 메일 제목
                subject = 'node_server_checker 확인 바랍니다.';
                // 메일 내용
                text = '노드 상태 체크 중 에러가 발생했습니다. \n\n' + 'node_server_checker checker.js 확인 바랍니다.';
                // 수신인
                receivers = ['sukim91@ksic.net'];
            }

            nodemailer.sendMail(sender, receivers, subject, text);

            check_mailing[updater.status] += 1;
        }
    }
};

var KMap = {
    init: (function () {
        check_mailing['geocoding kMap'] = 0;
        check_mailing['coronapath.info kMap'] = 0;
        check_mailing['MOAMap kMap2'] = 0;
    })(),
    execute: async function () {
        const geocoding = await this.geocoding();
        const MOAMap = await this.MOAMap();
        const coronapath = await this.coronapath();
    },
    geocoding: function () {
        return new Promise(resolve => {
            let check_option = {
                hostname: 'dev.ksic.net',
                headers: {
                    'Content-Type': 'application/xml'
                },
                port: '8090',
                path: '/kMap/MapService?cmd=getallmapinfoxml'
            };

            // geocoding status
            let geocoding = {};
            geocoding.status = "geocoding kMap";

            var request = this.servletRequest(http, check_option, geocoding);

            resolve(request);
        });
    },
    coronapath: function () {
        return new Promise(resolve => {
            let check_option = {
                hostname: 'dev.ksic.net',
                headers: {
                    'Content-Type': 'application/xml'
                },
                port: '8099',
                path: '/kMap/MapService?cmd=getallmapinfoxml'
            };

            // coronapath status
            let coronapath = {};
            coronapath.status = "coronapath.info kMap";

            var request = this.servletRequest(https, check_option, coronapath);

            resolve(request);
        });
    },
    MOAMap: function () {
        return new Promise(resolve => {
            let check_option = {
                hostname: 'dev.ksic.net',
                headers: {
                    'Content-Type': 'application/xml'
                },
                port: '8090',
                path: '/kMap2/MapService?cmd=getallmapinfoxml'
            };

            // MOAMap status
            let MOAMap = {};
            MOAMap.status = "MOAMap kMap2";

            var request = this.servletRequest(http, check_option, MOAMap);

            resolve(request);
        });
    },
    sendMail: function (status, data) {
        if (check_mailing[status] <= 0) {
            // 메일 제목
            let subject = status + ' 확인 바랍니다.';
            // 메일 내용
            let text = '정상 동작 여부 확인 바랍니다.';

            if (data)
            {
                // 메일 내용
                text = '정상 동작 여부 확인 바랍니다. \n\n' + data;
            }

            nodemailer.sendMail(sender, receivers, subject, text);

            check_mailing[status] += 1;
        }
    },
    servletRequest: function (protocol, check_option, module) {
        var request = protocol.get(check_option, function (res) {
            let msg = '',
                data = '',
                failCount = 0;

            res.setEncoding('utf-8').on('data', function (chunk) {
                data += chunk;
            }).on('end', function () {
                let chunk = data;

                if (res.statusCode == 200) {
                    msg = "statusCode: " + res.statusCode + ", status is ok.";
                    writeLog(module, msg);
                } else {
                    msg = "statusCode: " + res.statusCode + ", status is not ok.";
                    writeLog(module, msg);
                    failCount++;
                }

                xml2js.parseString(chunk, function(err, result) {
                    if (err)
                        console.error(err);
                    else {
                        let bool = false;
                        if (result && result['MapInfo']) {
                            bool = true;
                        }

                        if (!bool) {
                            msg = "Data is not ok. Data doesn't have MapInfo tag.";
                            writeLog(module, msg);
                            data = JSON.stringify(result);
                            failCount++;
                        } else {
                            msg = "Data is ok.";
                            writeLog(module, msg);
                        }
                    }
                });

                if (failCount > 0) {
                    let msg = "Error occurred! I will send mail everyone!";
                    console.error(data);
                    writeLog(module, msg);
                    KMap.sendMail(module.status, data);
                } else {
                    check_mailing[module.status] = 0;
                }
            });
        });
        request.on('error', function (err) {
            let msg = "Error occurred! I will send mail everyone!";
            console.error(err);
            writeLog(module, msg);
            KMap.sendMail(module.status);
        });
        request.end();

        return request;
    }
};

http.createServer(function (req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify(check_mailing));
    res.end();
}).listen(3000);