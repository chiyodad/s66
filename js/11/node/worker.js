const wdMain = require('selenium-webdriver'), By = wdMain.By, until = wdMain.until;
const wd = require('selenium-webdriver/lib/webdriver');
const fs = require('fs');
const getDriver = require('./driver.js');
const DRIVER = Symbol();

module.exports = class{
	constructor(url, loaded, driverOption){
		this[DRIVER] = getDriver(driverOption);
		this[DRIVER].get(url).then(loaded || (_=>0));
	}
	quit(){
		this[DRIVER].quit();
	}
	element(css, el = null){
		return (el || this[DRIVER]).findElement(By.css(css));
	}
	elements(css, el = null){
		return (el || this[DRIVER]).findElements(By.css(css));
	}	
	screenshot(path){
		return this[DRIVER].takeScreenshot().
			then(v=>new Promise(resolve=>fs.writeFile(
				path,
				v.replace(/^data:image\/png;base64,/, ""), 'base64', 
				_=>resolve(path)
			)));
	}
	waitLoaded(time){
	}
	waitCss(time, css){
		return this[DRIVER].wait(until.elementLocated(By.css(css)), time);
	}
	waitUntil(time, method, ...arg){
		return this[DRIVER].wait(until[method](...arg), time);
	}
	waitElement(time, title, f){
		return this[DRIVER].wait(new wd.WebElementCondition(title, f), time);
	}
	waitCondition(time, title, f){
		return this[DRIVER].wait(new wd.Condition(title, f), time);
	}
	by(method, v){
		return By[method](v);
	}
	get action(){
		return this[DRIVER].actions();
	}
	get touch(){
		return this[DRIVER].touchActions();
	}
	attribute(selector, attr, action = null, ...arg){
		return this.element(selector).then(
			el=>action ? el[action](...arg).then(_=>el.getAttribute(attr)) : el.getAttribute(attr)
		);
	}
	js(str){
		return this[DRIVER].executeScript(str);
	}
};