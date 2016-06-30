{
	const listener = {
		_logger(...arg){
			const key = '_' + KEY;
			if(!listener[key]) listener[key] = [];
			listener[key].push(arg);
		}
	};
	let KEY = '';
	const trap = {
		get(target, key, trap){
			console.log(key);
			KEY = key;
			return key[0] == '_' ? listener[key] : listener._logger;
		}
	};
	const translator = new AuctionMessageTranslator(new Proxy({}, trap));
	bsTest('notifiesAuctionClosedWhenCloseMessageReceived',
		_=>{
			const message = 'close';
			translator.processMessage(message);
			const log = listener._auctionClosed;
			return log.length == 1 && log[0].length == 0;
		}, true
	);
	bsTest('notifiesBidDetailsWhenCurrentPriceMessageReceived',
		_=>{
			const price = 192, increment = 7, bidder = 'other bidder';
			const message = `price,${price},${increment},${bidder}`;
			translator.processMessage(message);
			const log = listener._currentPrice;
			return log.length == 1 && log[0][0] == price && log[0][1] == increment && log[0][2] == bidder;
		}, true
	);
}
