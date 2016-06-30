const BROWSERS = 'firefox,chrome,edge,ie,opera,phantomjs,safari';
module.exports = opt=>{
	let {browser = 'chrome', x = 0, y = 0, width = 1200, height = 740, maximize = false} = opt || {};
	if(!BROWSERS.includes(browser)) throw `invalid browser:${browser}`;
	const Driver = require(`selenium-webdriver/${browser}`).Driver;
	const driver = new Driver(), window = driver.manage().window();
	if(maximize){
		window.maximize();
	}else{
		window.setPosition(x, y);
		window.setSize(width, height);
	}
	return driver;
};
