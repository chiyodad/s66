const Column = class{
	static get [0](){return new Column('itemId');}
	static get [1](){return new Column('lastPrice');}
	static get [2](){return new Column('lastBid');}
	static get [3](){return new Column('state');}
	static get length(){return 4;}
	
	constructor(name){
		this.name = name;
		Object.freeze(this);
	}
	valueIn(snapshot){
		return snapshot[this.name];
	}
};
const SniperSnapshot = class{
	static joining(itemId){
		return new SniperSnapshot(itemId, 0, 0, SniperState.JOINING);
	}
	constructor(itemId, lastPrice, lastBid, state){
		this.itemId = itemId;
		this.lastPrice = lastPrice;
		this.lastBid = lastBid;
		this.state = state;
		Object.freeze(this);
	}
	bidding(lastPrice, lastBid){
		return new SniperSnapshot(this.itemId, lastPrice, lastBid, SniperState.BIDDING);
	}
	winning(lastPrice){
		return new SniperSnapshot(this.itemId, lastPrice, this.lastBid, SniperState.WINNING);
	}
	closed(){
		return new SniperSnapshot(this.itemId, this.lastPrice, this.lastBid, this.state.whenAuctionClosed());
	}
	isForSameItemAs(snapshot){
		return snapshot.itemId == this.itemId;
	}
	get hash(){
		return `$$sniperState:${this.itemId}:${this.lastPrice}:${this.lastBid}`;
	}
};
const Table = class{
	constructor(){
		this.snapshots = [];
	}
	getColumeCount(){return Column.length;}
	getRowCount(){return this.snapshots.length;}
	getValueAt(rowIndex, columnIndex){return Column[columnIndex].valueIn(this.snapshots[rowIndex]);}
	getColumnName(column){return Column[column].name;}
	setTable(table){this.table = table;}
	addSniper(snapshot){
		let includes = false;
		for(const v of this.snapshots){
			if(v.isForSameItemAs(snapshot)) throw 'existed snapshot';
		}
		this.snapshots.push(snapshot);
	}
	sniperStateChange(snapshot){
		const row = this.rowMatching(snapshot);
		this.snapshots[row] = snapshot;
		this.render();
	}
	rowMatching(snapshot){
		for(let i = 0; i < this.snapshots.length; i++){
			if(snapshot.isForSameItemAs(this.snapshots[i])) return i;
		}
		throw 'cannot find match';
	}
	render(){
		if(!this.table) return;
		const rows = this.table.querySelectorAll('table>tr');
		let i = rows.length, j;
		while(i--) this.table.removeChild(rows[i]);
		if(!this.table.querySelector('thead')){
			const tr = this.table.appendChild(document.createElement('thead')).appendChild(document.createElement('tr'));
			for(i = 0; i < this.getColumeCount(); i++){	
				const th = tr.appendChild(document.createElement('th'));
				th.style.cssText = 'background:#aaa;color:#fff;width:110px;border-bottom:1px solid #000;border-right:1px solid #000;';
				th.innerHTML = this.getColumnName(i);
			}
		}
		for(i = 0; i < this.getRowCount(); i++){
			const row = this.table.appendChild(document.createElement('tr'));
			for(j = 0; j < this.getColumeCount(); j++){
				const cell = row.appendChild(document.createElement('td'));
				cell.style.cssText = 'text-align:center;padding:0;border-bottom:1px solid #000;border-right:1px solid #000;'
				cell.innerHTML = this.getValueAt(i, j);
			}
		}
	}
};
const MainWindow = class{
	static get MAIN_WINDOW_NAME(){return '<h1>AuctionSniper</h1>';}
	static get SNIPERS_TABLE_NAME(){return 'SnipersTable';}

	constructor(snipers){
		this.userRequests = new Set();
		this.snipers = snipers;
		this.frame = document.body.appendChild(document.createElement('div'));
		this.frame.style.cssText = 'background:#ffa;border:1px solid #000;border-radius:5px;margin:5px 10px 50px 10px';
		this.title = this.frame.appendChild(document.createElement('div'));
		this.title.style.cssText = 'margin:0 10px';
		this.title.innerHTML = MainWindow.MAIN_WINDOW_NAME;
		this.makeControls();
		this.snipers.setTable(this.makeSnipersTable());
	}
	adduserRequestListener(listener){
		this.userRequests.add(listener);
	}
	makeControls(){
		const panel = this.frame.appendChild(document.createElement('div'));
		panel.style.cssText = 'margin:10px';
		const itemId = panel.appendChild(document.createElement('input'));
		Object.assign(itemId, {type:'text', id:'itemId', placeholder:'item-00000'});
		const listener =_=>this.userRequests.forEach(request=>request(itemId.value));
		const button = panel.appendChild(document.createElement('input'));
		Object.assign(button, {type:'button', id:'joinAuction', value:'joinAuction', forceClick:listener});
		button.addEventListener('click', listener);
	}
	makeSnipersTable(){
		let snipersTable = this.frame.querySelector('table');
		if(!snipersTable){
			snipersTable = this.frame.appendChild(document.createElement('table'));
			snipersTable.id = 'snipersTable';
			snipersTable.style.cssText = 'border-spacing:0;border-collapse:separate;padding:0;border-top:1px solid #000;border-left:1px solid #000;background:#fff;margin:10px';
			const caption = snipersTable.appendChild(document.createElement('caption'));
			caption.innerHTML = MainWindow.SNIPERS_TABLE_NAME;
		}
		return snipersTable;
	}
	sniperStateChange(snapshot){this.snipers.sniperStateChange(snapshot);}
};
const SniperDisplayListener = class{
	constructor(snipers){this.snipers = snipers;}
	sniperStateChange(snapshot){this.snipers.sniperStateChange(snapshot);}
};
