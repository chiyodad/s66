const Worker = require('./node/worker.js');
const Reporter = require('./node/reporter.js');
const FakeAuctionServer = require('./auctionServer.js');
FakeAuctionServer.start(80);
const auction = new FakeAuctionServer('item-54321');
const auction2 = new FakeAuctionServer('item-65432');
const reporter = new Reporter({port:8080});

const test = {
	joined(){
		reporter.assert(`auction.hasReceivedJoin('hika')`, auction.hasReceivedJoin('hika'), true);
		reporter.assert(`auction2.hasReceivedJoin('hika')`, auction2.hasReceivedJoin('hika'), true);
		auction.reportPrice(1000, 98, 'other bidder');
		auction2.reportPrice(500, 21, 'other bidder');
		setTimeout(test.bidding, 1400);
	},
	bidding(){
		reporter.assert(`auction.hasReceivedBid('hika', 1098)`, auction.hasReceivedBid('hika', 1098), true);
		reporter.assert(`auction2.hasReceivedBid('hika', 521)`, auction2.hasReceivedBid('hika', 521), true);
		auction.reportPrice(1098, 97, 'hika');
		auction2.reportPrice(521, 21, 'hika');
		setTimeout(test.priceAfterBidding, 1400);
	},
	priceAfterBidding(){
		client.getJS(`runner.showsSniperIsWinning(${auction}, 1098)`, v=>{
			reporter.assert(`runner.showsSniperIsWinning(${auction}, 1098)`, v, true);
			auction.announceClosed();
		});
		client.getJS(`runner.showsSniperIsWinning(${auction2}, 521)`, v=>{
			reporter.assert(`runner.showsSniperIsWinning(${auction2}, 521)`, v, true);
			auction2.announceClosed();
		});
		setTimeout(test.wonAuction, 1400)
	},
	wonAuction(){
		client.getJS(`runner.showsSniperHasWonAuction(${auction}, 1098)`, 
			v=>reporter.assert(`runner.showsSniperHasWonAuction(${auction}, 1098)`, v, true));
		client.getJS(`runner.showsSniperHasWonAuction(${auction2}, 521)`,
			v=>reporter.assert(`runner.showsSniperHasWonAuction(${auction2}, 521)`, v, true));
	}
};

const client = new Worker(
	'http://127.0.0.1/index.html',
	{y:740}, 
	_=>{
		auction.startSellingItem();
		auction2.startSellingItem();
		client.js(`runner.startBiddingIn(${auction}, ${auction2})`);
		setTimeout(test.joined, 1000);
	}
);
