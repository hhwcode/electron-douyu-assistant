var $ = require('jquery')

const net = require('net');
const config = require('./config/config');
const request = require('request');

//房间号
var roomid = config.roomId;
var scrollable = true;
var count = 0;

connectToDouyu();

getInfo();

/**
 * 事件监听
 */
$(document).ready(function(){

    //滚动事件监听
    $('.chat-message').scroll(function(){
        var h = $('.chat-message').scrollTop() - ($('.chat-message ul').height() - $('.chat-message').height());
        if(h < -10) {
            scrollable = false;
        } else {
            scrollable = true;
        }
    });
});

function connectToDouyu() {
    //创建连接
    const s = net.connect({
        port: 8601,
        host: 'openbarrage.douyutv.com'
    }, () => {
        $('.chat-message ul').append('<li>弹幕服务器连接成功……</li>');
        console.log('弹幕服务器连接成功……');
    });

    //发送进入房间消息
    var msg = 'type@=loginreq/roomid@=' + roomid + '/';
    sendData(s, msg);
    //发送请求分组消息
    msg = 'type@=joingroup/rid@=' + roomid + '/gid@=1/';
    sendData(s, msg);

    //接收数据
    s.on('data', (chunk) => {
        formatData(chunk);
    });
    //接收错误消息
    s.on('error', (err) => {
        console.log(err);
    });
    //发送心跳消息，保持连接
    setInterval(() => {
        // let timestamp = parseInt(new Date()/1000);
        let msg = 'type@=mrkl/';
        sendData(s, msg);
    }, 45000);
}

//获取房间信息
function getRoomInfo() {
    request('http://open.douyucdn.cn/api/RoomApi/room/' + roomid, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            // console.log(body)
            let data = JSON.parse(body).data;
            $("title").html(data.room_name);
            console.log(data);
        }
    });
}

//定时获取
function getInfo() {
    getRoomInfo();
    setInterval(() => {
        getRoomInfo();
    }, 10000);
}

/**
 * 发送数据方法
 */
function sendData(s, msg) {
    let data = new Buffer(msg.length + 13);
    data.writeInt32LE(msg.length + 9, 0);
    data.writeInt32LE(msg.length + 9, 4);
    data.writeInt32LE(689, 8);
    data.write(msg + '\0', 12);
    s.write(data);
}

/**
 * 格式化接收的消息
 * @param {*} msg 
 */
function formatData(msg) {
    const sliced = msg.slice(12).toString();
    // 减二删掉最后的'/'和'\0'
    const splited = sliced.substring(0, sliced.length - 2).split('/');
    const map = formatDanmu(splited);
    analyseDanmu(map);
}


/**
 * 将消息生成json
 * @param {*} msg 
 */
function formatDanmu(msg) {
    let map = {};
    for (let i in msg) {
        let splited = msg[i].split('@=');
        map[splited[0]] = splited[1];
    }
    return map;
}

/**
 * 处理消息
 * @param {*} msg 
 */
function analyseDanmu(msg) {
    // console.log(msg);
    //弹幕颜色
    var chatMessageColor = '';
    //贵族弹幕
    var messageBg = '';

    //弹幕信息
    if (msg['type'] == 'chatmsg') {
        //贵族弹幕等级
        if(msg['nc'] == '1') {
            // console.log(msg['nl']);
            if(msg['nl'] == '3') {
                messageBg = ' style="background-color:#1e87f0; color:white" ';
            } else if(msg['nl'] == '4') {
                messageBg = ' style="background-color:#9b39f4; color:white" ';
            } else {
                messageBg = ' style="background-color:#FF7F00; color:white" ';
            }
            
        } else {
            //彩色弹幕
            if(msg['col'] == '2') {
                chatMessageColor = '#1e87f0';
            }
    
            if(msg['col'] == '3') {
                chatMessageColor = '#7ac84b';
            }
            if(msg['col'] == '6') {
                chatMessageColor = '#FF69B4';
            }
            if(msg['col'] == '4') {
                chatMessageColor = '#FF7F00';
            }
            if(msg['col'] == '5') {
                chatMessageColor = '#9b39f4';
            }
            if(msg['col'] == '1') {
                chatMessageColor = 'red';
            }
        }

        $('.chat-message ul').append('<li'+messageBg+'>' + '[' + msg['level'] + ']' + '<span>' + msg['nn'] + '</span>' + 
        '： ' + '<span style="color:' + chatMessageColor + '">' + msg['txt'] + '</span>' + '</li>');

        //多余200条删除顶部弹幕
        count = count + 1;
        if(count > 200) {
            $('.chat-message ul').children('li:first').remove();
        }     
    }
    //进房信息
    if (msg['type'] == 'uenter') {

        $('.chat-message ul').append('<li style="color:#666">' + '[' + msg['level'] + ']' + msg['nn'] + ' 进入了直播间');

        count = count + 1;
        if(count > 200) {
            $('.chat-message ul').children('li:first').remove();
        } 
    }

    //滚动弹幕
    if (this.scrollable) {
        let h = $('.chat-message ul').height() - $('.chat-message').height();
        $('.chat-message').scrollTop(h);
    }

}