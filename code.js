let $adminPasswordInput = $('#admin-password');
let $loginButton = $('#login');
let $loginPage = $('#login-page');
let $drawPage = $('#draw-page');
let $totalUser = $('#total-user');
let hideClass = 'hide';
let $startButton = $('#start');
let $drawCountInput = $('#number');
let $prizeType = $('#prize-type');
let $console = $('#console');
let $consoleControl = $('#console-control');
let $loadingText = $('#loading-text');
let $win = $(window);
let $body = $('body');
let $viewWinner = $('#view-winner');
let $prizeList = $('#list');
let $prizeListLoading = $('#list-loading');
let $backToDraw = $('#back-to-draw');
let $backBtn = $('#back');
let $resetBtn = $('#reset');

let randomOrgApiKey = '';
let randomId = 1;

let userIndex = 0;
let width = $win.width();
let height = $win.height();

let users = [];
let painted = false;

$adminPasswordInput.keyup(function (event) {
    if (event.keyCode === 13) {
        $loginButton.click();
    }
});

$loginButton.click(function () {
    let pwd = $adminPasswordInput.val().trim();
    let originalText = $loginButton.text();
    $loginButton.text('Logging...').prop('disabled', true);
    $.ajax({
        url: '/api/checkLuckyAdmin',
        method: 'post',
        contentType: 'application/json',
        data: JSON.stringify(pwd),
        success: function (response) {
            $loginPage.addClass(hideClass);
            $drawPage.removeClass(hideClass);
            init();
            randomOrgApiKey = response;
        },
        error: function () {
            alert('Wrong password or server error.');
        },
        complete: function () {
            $loginButton.text(originalText).prop('disabled', false);
        }
    })
});

function init() {
    getUsers();
    window.onresize = function () {
        paintBackground();
    };

    $backBtn.click(function () {
        $console.addClass(hideClass);
        $consoleControl.addClass(hideClass);
        $drawPage.removeClass(hideClass);
        $console.find('p:not(.fixed)').remove();
    });

    $('#zoom-in').click(function () {
        let currentSize = Number($console.css('font-size').replace('px', ''));
        $console.css('font-size', `${currentSize + 1}px`);
    });

    $('#zoom-out').click(function () {
        let currentSize = Number($console.css('font-size').replace('px', ''));
        $console.css('font-size', `${currentSize - 1}px`);
    });

    $resetBtn.click(function () {
        $console.css('font-size', '');
    });

    $backToDraw.click(function () {
        $drawPage.removeClass('show-list');
        $backToDraw.addClass(hideClass);
        $prizeList.find('>div').remove();
    })

    $viewWinner.click(function () {
        $drawPage.one('transitionend', function () {
            $.ajax({
                url: '/api/adminGetPrizeList',
                success: function (response) {
                    let $firstPrizeDiv = $('<div><h3 class="first">First Prize</h3><div class="name-container"></div></div>').appendTo($prizeList);
                    let $secondPrizeDiv = $('<div><h3 class="second">Second Prize</h3><div class="name-container"></div></div>').appendTo($prizeList);
                    let $thirdPrizeDiv = $('<div><h3 class="third">Third Prize</h3><div class="name-container"></div></div>').appendTo($prizeList);
                    response.forEach(user => {
                        let $div;
                        switch (user.prizeType) {
                            case 1:
                                $div = $firstPrizeDiv;
                                break;
                            case 2:
                                $div = $secondPrizeDiv;
                                break;
                            case 3:
                                $div = $thirdPrizeDiv;
                                break;
                        }
                        $div = $div.find('>.name-container');
                        $div.append(`<div>${user.displayName} <span>(${user.alias})</span></div>`);
                    });
                    $backToDraw.removeClass(hideClass);
                },
                complete: function () {
                    $prizeListLoading.addClass(hideClass);
                }
            });
        })
        $drawPage.addClass('show-list');
        $prizeListLoading.removeClass(hideClass);
    });

    $startButton.click(function () {
        setTimeout(() => {
            $resetBtn.click();
        }, 0);
        let drawCount = Number($drawCountInput.val());
        let prizeType = Number($prizeType.val());
        let prizeText = $prizeType.find('option:selected').text();
        let min = 0;
        let max = users.length - 1;
        if (drawCount <= users.length) {
            let data = {
                jsonrpc: "2.0",
                method: "generateIntegers",
                params: {
                    apiKey: randomOrgApiKey,
                    n: drawCount,
                    min: min,
                    max: max,
                    replacement: false
                },
                id: randomId
            };
            $drawPage.addClass(hideClass);
            $backToDraw.addClass(hideClass);
            $console.removeClass(hideClass);
            $consoleControl.removeClass(hideClass);
            cmd.writeHighlight(`We are going to draw ${drawCount} ${drawCount > 1 ? 'people' : 'person'} from ${users.length} people for the ${prizeText}!`).then(function () {
                cmd.writeEcho(`Sending request to https://api.random.org/ to get ${drawCount} true random integer${drawCount > 1 ? 's' : ''} between ${min} ~ ${max}.`).then(function () {
                    $.ajax({
                        url: 'https://api.random.org/json-rpc/1/invoke',
                        method: 'post',
                        contentType: 'application/json-rpc',
                        timeout:5000,
                        data: JSON.stringify(data),
                        success: function (response) {
                            let aliasList = [];
                            cmd.echo(`Result: [${response.result.random.data.join(', ')}]`);
                            cmd.echo(`Dumping the lucky fellows...`);
                            let writeArgs = [];
                            response.result.random.data.forEach(index => {
                                writeArgs.push(`users[${index}]: ${users[index].displayName} (${users[index].alias})`);
                                aliasList.push(users[index].alias);
                            });
                            doPromiseInOrder(writeArgs, cmd.writeHighlight).then(function () {
                                cmd.echo(`Congratulate above ${drawCount > 1 ? 'people' : 'person'} on winning the ${prizeText}!`);
                                cmd.echo(`Saving data and removing above ${drawCount > 1 ? 'people' : 'person'} from lucky draw pool...`);
                                $.ajax({
                                    url: '/api/adminWinPrize',
                                    contentType: 'application/json',
                                    method: 'post',
                                    data: JSON.stringify({
                                        prizeType: prizeType,
                                        aliases: aliasList
                                    }),
                                    success: function (response) {
                                        cmd.echo(`Remaining user count: ${response}`);
                                        cmd.echoClickableText('Click to view all prize winners.', function () {
                                            $backBtn.click();
                                            setTimeout(() => {
                                                $viewWinner.click();
                                            }, 0);
                                        });
                                        cmd.echoClickableText('Click to draw a new batch.', function () {
                                            $backBtn.click();
                                        });
                                    }
                                });
                            });
                        },
                        error : function(xhr,textStatus){
                            console.log('error:'+textStatus);
                            if(textStatus == 'timeout') {
                                let aliasList = [];
                                let setOfLuckyDraw = new Set()
                                console.log('max')
                                console.log(max)
                                while (setOfLuckyDraw.size < drawCount) {
                                    console.log('set:')
                                    console.log(setOfLuckyDraw.size)
                                    setOfLuckyDraw.add(Math.floor(Math.random()*max))
                                }
                                let arrayOfLuckyDraw = [...setOfLuckyDraw] 
                                cmd.echo(`Result: [${arrayOfLuckyDraw.join(', ')}]`);
                                cmd.echo(`Dumping the lucky fellows...`);
                                let writeArgs = [];
                                
                                arrayOfLuckyDraw.forEach(index => {
                                    writeArgs.push(`users[${index}]: ${users[index].displayName} (${users[index].alias})`);
                                    aliasList.push(users[index].alias);
                                });
                                
                                doPromiseInOrder(writeArgs, cmd.writeHighlight).then(function () {
                                    cmd.echo(`Congratulate above ${drawCount > 1 ? 'people' : 'person'} on winning the ${prizeText}!`);
                                    cmd.echo(`Saving data and removing above ${drawCount > 1 ? 'people' : 'person'} from lucky draw pool...`);
                                    $.ajax({
                                        url: '/api/adminWinPrize',
                                        contentType: 'application/json',
                                        method: 'post',
                                        data: JSON.stringify({
                                            prizeType: prizeType,
                                            aliases: aliasList
                                        }),
                                        success: function (response) {
                                            cmd.echo(`Remaining user count: ${response}`);
                                            cmd.echoClickableText('Click to view all prize winners.', function () {
                                                $backBtn.click();
                                                setTimeout(() => {
                                                    $viewWinner.click();
                                                }, 0);
                                            });
                                            cmd.echoClickableText('Click to draw a new batch.', function () {
                                                $backBtn.click();
                                            });
                                        }
                                    });
                                });
                                randomId++;
                            }
                        },
                        complete: function () {
                            randomId++;
                        }
                    });
                });
            });
        }
    });
};

let cmd = {
    echo: function (message, className) {
        let $p = $('<p></p>').appendTo($console);
        $p.text(message);
        if (className) {
            $p.addClass(className);
        }
        this.scrollToBottom();
    },
    echoClickableText: function (message, onclick) {
        let $p = $(`<p><a href="javascript:;"></a></p>`).appendTo($console);
        $p.find('a').text(message).click(function () {
            onclick();
        });
        this.scrollToBottom();
    },
    highlight: function (message) {
        this.echo(message, 'green');
    },
    writeHighlight: function (message) {
        return cmd.writeEcho(message, 'green');
    },
    writeEcho: function (message, className) {
        let $p = $('<p></p>').appendTo($console);
        if (className) {
            $p.addClass(className);
        }
        let index = 0;
        return new Promise(function (resolve) {
            setInterval(() => {
                if (index < message.length) {
                    cmd._writeSingle($p, message, index);
                    if (index === 0) {
                        cmd.scrollToBottom();
                    }
                    index++;
                } else {
                    resolve();
                }
            }, 20);
        });
    },
    scrollToBottom: function () {
        $console.scrollTop($console[0].scrollHeight);
    },
    _writeSingle: function ($p, message, index) {
        let text = $p.text();
        $p.text(text += message[index]);
    }
};

function getUsers() {
    $.ajax({
        url: '/api/adminGetUsers',
        dataType: 'json',
        success: function (response) {
            users = response;
            if (!painted && users.length > 0) {
                paintBackground();
            }
            if (userIndex > response.length - 1) {
                userIndex = 0;
            }
            $totalUser.text(users.length);
            setTimeout(() => {
                getUsers();
            }, 5000);
        }
    });
}

function paintBackground() {
    painted = true;
    width = $win.width();
    height = $win.height();
    let rowNumber = Math.floor(height / 65);
    let lineHeight = height / rowNumber - 30;
    $body.removeClass('move');
    $body.find('.bg').remove();
    userIndex = 0;
    let $first = $('<div class="bg first"></div>').width(width).height(height).appendTo($body);
    appendContent($first);
    let $second = $('<div class="bg second"></div>').width(width).height(height).appendTo($body);
    appendContent($second);
    trigger();
    function trigger() {
        setTimeout(() => {
            $body.addClass('move');
        }, 0);
        $second.one('transitionend', function () {
            $first.remove();
            $body.removeClass('move');
            $second.addClass('first').removeClass('second');
            $first = $('.first.bg');
            $second = $('<div class="bg second"></div>').width(width).height(height).appendTo($body);
            appendContent($second);
            trigger();
        });
    }

    function appendContent($container) {
        let stop = false;
        while (!stop && users.length) {
            $container.append(`<div style="line-height:${lineHeight}px">${users[userIndex].displayName}</div>`);
            if ($container[0].scrollHeight > $container[0].clientHeight) {
                stop = true;
                $container.find('>div:last').remove();
            }
            if (userIndex < users.length - 1) {
                userIndex++
            } else {
                userIndex = 0;
            }
        }
    }
}
function doPromiseInOrder(argsList, promiseFunc, each, thisPtr) {
    if (arguments.length === 3) {
        if (typeof each === 'function') {
            thisPtr = window;
        } else {
            thisPtr = each;
            each = null;
        }
    }
    return new Promise(function (resolve, reject) {
        var resultList = [];
        go(0);
        function go(index) {
            promiseFunc.apply(thisPtr, isArray(argsList[index]) ? argsList[index] : [argsList[index]]).then(function (result) {
                resultList.push(result);
                if (each) {
                    each.call(thisPtr, result);
                }
                if (index + 1 === argsList.length) {
                    resolve(resultList);
                } else {
                    go(index + 1);
                }
            }).catch(function (reason) {
                reject(reason);
            });
        }
    });
};

function isArray(obj) {
    return Object.prototype.toString.call(obj).toLowerCase() === '[object array]';
}
