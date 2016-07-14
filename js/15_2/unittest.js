{
	const trap = {
		get(target, key, trap){
			if(typeof key == 'string' && key != 'isCalled' && key != 'isCalledWithState' && key != '_key' && key != '_logger' && key[0] != '_'){
				target._key = key;
				return target._logger;
			}else return target[key];
		}
	};
	const Mock = class{
		constructor(states = {}){
			this.__states = states;
			this.__state = '';
			return new Proxy(this, trap);
		}
		_logger(...arg){
			const key = '_' + this._key, state = this.__states[this._key];
			if(!this[key]) this[key] = [];
			if(state) this.__state = state;
			arg.state = this.__state;
			this[key].push(arg);
		}
		isCalledWithState(state, method, callCount, argCount = 0, ...arg){
			const result = this.isCalled(method, callCount, argCount, ...arg);
			if(result !== true) return result;
			const origin = this['_' + method][0].state;
			if(origin !== state) return `${method} 호출시 상태 ${origin}. 기대상태 ${state}`;
			return true;
		}
		isCalled(method, callCount, argCount = 0, ...arg){
			const call = this['_' + method];
			if(!call || call.length != callCount) return `${method} ${call ? call.length : 0}회 호출됨. 기대값 ${callCount}회`;
			if(call[0].length != argCount) return `${method} 호출시 인자 ${call[0].length}개 전달됨. 기대값 ${argCount}개`;
			if(argCount){
				const err = [];
				arg.forEach((v, idx)=>{
					let origin = call[0][idx];
					if(origin.hash){
						if(!v.hash) return err.push(`${idx}번째 기대값 ${v}가 hash를 지원안함`);
						origin = origin.hash;
						v = v.hash;
					}
					if(origin !== v) err.push(`${idx} 인자는 ${call[0][idx]}. 기대값 ${v}`);
				});
				if(err.length) return '<br>' + err.join('<br>');
			}
			return true;
		}
	};
}
/*
	{
		const ITEM_ID = 1123;
		const sniperListener = new Mock();
		const auction = new Mock();
		const sniper = new AuctionSniper(ITEM_ID, auction, sniperListener);
		bsTest('13.reportsLostWhenActionCloses',
			_=>{
				sniper.auctionClosed();
				const log = sniperListener._sniperLost;
				return log.length == 1 && log[0].length == 0;
			}, true
		);
		bsTest('14.reportIsWinningWhenCurrentPriceComesFromSniper',
			_=>{
				const price = 123, increment = 45, bidder = PriceSource.FromSniper;
				sniper.currentPrice(price, increment, bidder);
				const log = sniperListener._sniperWinning;
				return log.length >= 1 && log[0].length == 0;
			}, true
		);
		bsTest('15.bidHigherAndReportsBiddingWhenPriceArrives',
			_=>{
				const price = 1001, increment = 25, bid = price + increment, bidder = PriceSource.FromOtherBidder;
				sniper.currentPrice(price, increment, bidder);
				return auction.isCalled('bid', 1, 1, bid) === true && 
					sniperListener.isCalled('sniperBidding', 1, 1, new SniperState(ITEM_ID, price, bid))  === true
			}, true
		);
	}
	{
		const SNIPER_ID = 'hika';
		bsTest('14.notifiesBidDetailsWhenCurrentPriceMessageReceivedFromOtherBidder',
			_=>{
				const listener = new Mock();
				const translator = new AuctionMessageTranslator(SNIPER_ID, listener);
				
				const price = 192, increment = 7, bidder = 'Someone else';
				const message = `price,${price},${increment},${bidder}`;
				translator.processMessage(message);
				const log = listener._currentPrice;
				return log.length == 1 && log[0][0] == price && log[0][1] == increment && 
					log[0][2] == PriceSource.FromOtherBidder;
			}, true
		);
		bsTest('14.notifiesBidDetailsWhenCurrentPriceMessageReceivedFromSniper',
			_=>{
				const listener = new Mock();
				const translator = new AuctionMessageTranslator(SNIPER_ID, listener);
				
				const price = 234, increment = 5, bidder = SNIPER_ID;
				const message = `price,${price},${increment},${bidder}`;
				translator.processMessage(message);
				const log = listener._currentPrice;
				return log.length == 1 && log[0][0] == price && log[0][1] == increment && 
					log[0][2] == PriceSource.FromSniper;
			}, true
		);
	}
	{
		const ITEM_ID = 1123;
		bsTest('14.reportsLostIfAuctionClosesImmediately',
			_=>{
				const sniperListener = new Mock();
				const auction = new Mock();
				const sniper = new AuctionSniper(ITEM_ID, auction, sniperListener);
				
				sniper.auctionClosed();
				const log = sniperListener._sniperLost;
				return log.length == 1 && log[0].length == 0;
			}, true
		);
		bsTest('14.reportsLostIfAuctionClosesWhenBidding',
			_=>{
				const sniperListener = new Mock({
					sniperBidding:'bidding'
				});
				const auction = new Mock();
				const sniper = new AuctionSniper(ITEM_ID, auction, sniperListener);
		
				const price = 123, increment = 45, bidder = PriceSource.FromOtherBidder;
				sniper.currentPrice(price, increment, bidder);
				sniper.auctionClosed();
				return sniperListener.isCalled('sniperBidding', 1, 1) === true && 
					sniperListener.isCalledWithState('bidding', 'sniperLost', 1)  === true;
			}, true
		);
		bsTest('14.reportsWonIfAuctionClosesWhenWinning',
			_=>{
				const sniperListener = new Mock({
					sniperWinning:'winning'
				});
				const auction = new Mock();
				const sniper = new AuctionSniper(ITEM_ID, auction, sniperListener);
		
				const price = 123, increment = 45, bidder = PriceSource.FromSniper;
				sniper.currentPrice(price, increment, bidder);
				sniper.auctionClosed();
				const log0 = sniperListener._sniperWinning, log1 = sniperListener._sniperWon;
				return log0.length == 1 && log0[0].length == 0 &&
					log1.length >= 1 && log1[0].length == 0 && log1[0].state == 'winning';
			}, true
		);
	}
}
*/