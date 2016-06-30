const Connection =(_=>{
	let scriptListener;
	return class{
		static connection(url, listener){
			const script = document.head.appendChild(document.createElement('script'));
			script.src = `http://127.0.0.1:8080/${url}`;
			scriptListener = listener;
			return script;
		}		
		static callback(data){
			if(scriptListener) scriptListener(data);
		}
		static pushed(){
			Connection.connection(
				'', 
				data=>{
					if(data == '') runner.main.ui.showStatus(MainWindow.STATUS_LOST);
				}
			);
		}
	};
})();
const MainWindow = class{
	static get STATUS_JOINING(){return 'joining';}
	static get STATUS_LOST(){return 'lost';}
	constructor(){
		const frame = document.body.appendChild(document.createElement('div'));
		frame.style.cssText = 'background:#ff0;border:1px solid #000;border-radius:5px';
		this.sniperStatus = frame.appendChild(document.createElement('div'));
		this.sniperStatus.id = 'sniperStatus';
	}
	showStatus(status){
		this.sniperStatus.innerHTML = status;
	}
}
const Main = class{
	constructor(sniperId, itemId){
		this.sniperId = sniperId;
		this.itemId = itemId;
		this.ui = new MainWindow();
		this.joinAuction(this.itemId);
	}	
	joinAuction(itemId){
		Connection.connection(
			`join/${itemId}`, 
			data=>this.ui.showStatus(MainWindow.STATUS_JOINING)
		);
	}
};
const Driver = class{
	constructor(main){
		this.main = main;
	}
	showSniperStatus(statusText){
		return document.getElementById('sniperStatus').innerHTML.includes(statusText);
	}
};
const Runner = class{
	constructor(){
		this.sniper_id = 'hika';
	}
	startBiddingIn(itemId){
		this.main = new Main(this.sniper_id, itemId);
		this.driver = new Driver(this.main);
		this.driver.showSniperStatus(MainWindow.STATUS_JOINING);
	}
	showsSniperHasLostAuction(){
		return this.driver.showSniperStatus(MainWindow.STATUS_LOST);
	}
};
let runner;
