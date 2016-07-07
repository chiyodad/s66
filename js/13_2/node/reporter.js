const http = require('http');
const url = require('url');
const fs = require('fs');
const getDriver = require('./driver.js');
//assert
const format = v=>typeof v == 'string' ? "'" + v + "'" : v;
const result = v=>`<span style="font-size:20px;color:#${v ? '0a0' : 'a00'}">${v}</span>`;
//server
const requestListener = (request, response)=>{
	const pathname = url.parse(request.url).pathname;
	const head = {'Content-Type': 'text/html'};
	if(pathname.indexOf('.png') > -1){
		head['Content-Type'] = 'image/png';
		fs.readFile(pathname.split('/').pop(), (e,v)=>res200(response, head, v));
	}else if(pathname == '/'){
		res200(response, head, BODY);
	}
};
const res200 = (response, head, body)=>(response.writeHead(200, head),response.end(body));
const BODY = `<!doctype html><html><head><meta charset="utf-8"><title>Report</title></head><body>
	<ol id="report"></ol>
</body></html>`;

const DRIVER = Symbol(), SERVER = Symbol();
module.exports = class{
	constructor(driverOption){
		this[SERVER] = http.createServer(requestListener).listen(80);
		this[DRIVER] = getDriver(driverOption);
		this[DRIVER].get('http://127.0.0.1/');
		Object.freeze(this);
	}
	report(value){
		return this[DRIVER].executeScript(
			`document.getElementById('report').innerHTML += '<li>' + '${value}' + '</li>';`
		);
	}
	assert(title, value, expect){
		const v = [
			'<li>',
				`<h3>${title}</h3>`,
				`<div>value:${format(value)} == expect:${format(expect)}</div>`,
				`<div>${result(value === expect)}`,
			'</li>'
		].join('');
		return this[DRIVER].executeScript(`document.getElementById('report').innerHTML += "${v.replace(/["]/g,'\\"')}";`);	
	}
	quit(){ //종료시킴
		this[DRIVER].quit();
	}
};
