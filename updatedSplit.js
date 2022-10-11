
import express, { Request, Response } from "express";
import { Payment } from "../models/payment.model";
import { getRepository, Transaction } from "typeorm";
import FeedbackController from "../controllers/feedback.controller";
import PaymentController from "../controllers/payment.controller";
import { Role } from "../enums";
import { authorizeUser, validateToken } from "../middlewares/auth.middleware";
import { catchAsync, NotFoundException, TransactionIdExpired } from "../utils/error.util";
import { getCurrentUser } from "../utils/common.util";
import { ERROR_MESSAGE } from "../constants";
import { PaymentTransactionLogs } from "../models/payment-transaction-logs.model";
import { any } from "joi";
 var session = require('express-session');
var router = express();
var bodyParser = require('body-parser');
var path = require('path');
var crypto = require('crypto');
var reqpost = require('request');



router.use(bodyParser.urlencoded({ extended: true }));
router.use(session({secret: 'mcg001k',saveUninitialized: true,resave: true}));

router.use(express.static(__dirname + '/'));
router.engine('html', require('ejs').renderFile);
router.set('view engine', 'html');
router.set('views', __dirname);





var key = "A6lB8r";
var salt = "c5KkKHlv";
var splitRequest:any = { "type": "absolute", "splitInfo": { "imAJ7I": { "aggregatorSubTxnId": "d256d0c062f07b457c10y", "aggregatorSubAmt": "50", "aggregatorCharges": "20" }, "qOoYIv": { "aggregatorSubTxnId": "d256d0c062f07b457c10z", "aggregatorSubAmt": "30", "aggregatorCharges": "0" } } }
// 
splitRequest = JSON.stringify(splitRequest);

router.get('/', async function (req, res) {
	var ord = JSON.stringify(Math.random() * 1000);
	var i = ord.indexOf('.');
	ord = 'ORD' + ord.substr(0, i);

	// let currentuser = await getCurrentUser(req);
	// let tokenString: any = req.query.t;

	// console.log("===============================INITIATING PAYMENT========================");

	
	// console.log(tokenString);

	// const currentuser = await validateToken(tokenString, [Role.CITIZEN]);

	// console.log(currentuser.firstName)

	// let ord = req.query.i?.toString();

	//check orderid
	// if(req.query.i == null) res.send(ERROR_MESSAGE.NOT_FOUND)


/* 	if (req.query.i == null) {
		ord = JSON.stringify(Math.random() * 1000);
		var i = ord.indexOf('.');
		ord = 'ORD' + ord.substr(0, i);
	}


	const paymentRepository = getRepository(Payment);

	//get data from payment based on order id/ transaction id
	const payment = await paymentRepository.findOne({ transactionId: ord });

	//check if order id exists
	if (!payment) res.send(ERROR_MESSAGE.NOT_FOUND)

	//check if it belongs to current citizen;
	// if(currentuser.id != payment.reqCitizen.id) throw new NotFoundException();


	if (new Date() > payment!.expiryTime) res.send(ERROR_MESSAGE.TRANSACTION_ID_EXPIRED);
	let name = "test";
 */


	console.log("===================================Hash-API called=================================")
	res.render("/root/g2c/MitaanBackend/src/templates/checkout.html", { orderid: ord, key: key });  //, name : name

});



router.post('/', function (req: any, res: any) {
	var strdat = "";
	console.log("===================================Transaction-API called=================================",req.body);

	
	req.on('data', function (chunk:any) {
		console.log(chunk)
	    strdat += chunk;
		console.log("Data", strdat);
	});

	// });

	req.on('end', function(){
	// {
	var data = JSON.parse(strdat);		
	
	//generate hash with mandatory parameters and udf5
	var cryp = crypto.createHash('sha512');
	// var text = key + '|' + data.txnid + '|' + data.amount + '|' + data.productinfo + '|' + data.firstname + '|' + data.email + '|||||' + data.udf5 + '||||||' + salt;
	
	const text = `${key}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|||||||||||${salt}|${data.splitRequest}`

	
	cryp.update(text);
	var hash = cryp.digest('hex');
	res.setHeader("Content-Type", "text/json");
	res.setHeader("Access-Control-Allow-Origin", "*");

	// console.log(JSON.stringify(hash));
	
	res.send(JSON.stringify(hash));

	 });	
	
});


router.post('/genhash', function (req: any, res: any) {



	var data = req.body.data;

	console.log("--------------data")
	console.log(data)


	//generate hash with mandatory parameters and udf5
	var cryp = crypto.createHash('sha512');
	// var text = key+'|'+data.txnid+'|'+data.amount+'|'+data.productinfo+'|'+data.firstname+'|'+data.email+'|||||'+data.udf5+'||||||'+salt;
	var text = data;
	cryp.update(text);
	var hash = cryp.digest('hex');
	res.setHeader("Content-Type", "text/json");
	res.setHeader("Access-Control-Allow-Origin", "*");

	console.log(JSON.stringify(hash));
	res.end(JSON.stringify(hash));

});

router.post("/success", function (req, res) {
	res.send("Transaction completed successfully. redirecting...")
})



router.post(
	"/initiate-payment",
	authorizeUser([Role.CITIZEN]),
	catchAsync(async (req: Request, res: Response) => {
		const controller = new PaymentController(req);
		const response = await controller.initiatePaymentRequest(req.body);
		return res.send(response);
	})
);

router.get(
	"/transaction/:transaction_id",
	authorizeUser([Role.CITIZEN]),
	catchAsync(async (req: Request, res: Response) => {
		const paymentRepository = getRepository(Payment);

		let data = await paymentRepository.query(`
	  select * from payment where transaction_id="${req.params.transaction_id}"
  
  ;`);


		res.send({ "success": true, "data": data })
	})
);

router.post(
	"/transactionlog",


	authorizeUser([Role.CITIZEN]),
	catchAsync(async (req: Request, res: Response) => {
		var data = req.body.data;

		const currentUser = await getCurrentUser(req)
		const controller = new PaymentController(req);
		const paymentRepository = getRepository(Payment);

		const transactionId = req.body.transaction_id;


		const paymentObj = await paymentRepository.findOne({
			transactionId : transactionId 
		})

		var transaction = await getRepository(PaymentTransactionLogs).save({
			...new PaymentTransactionLogs(),
			payment: paymentObj,
			status: req.body.status,
			mihpayid: req.body.mihpayid,
			response: JSON.stringify(data),
			createdBy: currentUser.id,
			updatedBy: currentUser.id,
			
		  });

		res.send({ "success": true, "data": transaction })
	})

)

//Update application payment status

router.put('/paymentStatus', function(req, res){
	
})






router.post('/response.html', function (req, res) {
	var verified = 'No';
	var txnid = req.body.txnid;
	var amount = req.body.amount;
	var productinfo = req.body.productinfo;
	var firstname = req.body.firstname;
	var email = req.body.email;
	// var udf5 = req.body.udf5;
	var mihpayid = req.body.mihpayid;
	var status = req.body.status;
	var resphash = req.body.hash;
	var additionalcharges = "";
	var keyString = key + '|' + txnid + '|' + amount + '|' + productinfo + '|' + firstname + '|' + email + '||||||||||' ; //+ udf5 + '|||||'
	var keyArray = keyString.split('|');
	var reverseKeyArray = keyArray.reverse();
	var reverseKeyString = salt + '|' + status + '|' + reverseKeyArray.join('|');
	if (typeof req.body.additionalCharges !== 'undefined') {
		additionalcharges = req.body.additionalCharges;
		reverseKeyString = additionalcharges + '|' + reverseKeyString;
	}
	var cryp = crypto.createHash('sha512');
	cryp.update(reverseKeyString);
	var calchash = cryp.digest('hex');

	var msg = 'Payment failed for Hash not verified...<br />Check Console Log for full response...';

	if (calchash == resphash) {
		msg = 'Transaction Successful and Hash Verified...<br />Check Console Log for full response...';

	}
	console.log("Status:___________________ " + status);
	console.log(req.body);

	var command = "verify_payment";

	var hash_str = key + '|' + command + '|' + txnid + '|' + salt;
	console.log(hash_str, "hash")
	var vcryp = crypto.createHash('sha512');
	vcryp.update(hash_str);
	var vhash = vcryp.digest('hex');

	var vdata :any= '';
	var details:any = '';

	var options = {
		method: 'POST',
		uri: 'https://test.payu.in/merchant/postservice.php?form=2',
		//uri: 'http://test.payu.in/merchant/_payment',
		form: {
			key: key,
			hash: vhash,
			var1: txnid,
			command: command
		},
		headers: {
			/* 'content-type': 'application/x-www-form-urlencoded' */ // Is set automatically
		}
	};

	/* reqpost(options)
		.on('response', function (resp: { statusCode: string; setEncoding: (arg0: string) => void; on: (arg0: string, arg1: (chunk: any) => void) => void; }) {
			console.log('STATUS:' + resp.statusCode);
			resp.setEncoding('utf8');
			resp.on('data', function (chunk: string) {
				let vdata: any = JSON.parse(chunk);

				if (vdata["status"] == '1') {
					let details = vdata.transaction_details[txnid];
					console.log(details['status'] + '   ' + details['mihpayid']);
					if (details['status'] == 'success' && details['mihpayid'] == mihpayid)
						verified = "Yes";
					else
						verified = "No";

					res.render("/root/g2c/MitaanBackend/src/templates/response.html", {
						txnid: txnid, amount: amount, productinfo: productinfo,
						additionalcharges: additionalcharges, firstname: firstname, email: email, mihpayid: mihpayid, status: status, resphash: resphash, msg: msg, verified: verified
					});
				}
			});
		})
		.on('error', function (err: any) {
			console.log(err);
		});
 */
		var split_command = "get_split_info"

		var split_hash_str = `${key}|${split_command}|${mihpayid}|${salt}`;
		console.log("split_hash_str", split_hash_str);
		var split_hash = crypto.createHash("sha512");
		console.log("split_hash_str_hashed", split_hash);
		split_hash.update(split_hash_str);
		var split_hash_value = split_hash.digest("hex");
	  
		console.log("Split Hash Value: " + split_hash_str);
	  
		var split_req_options = {
		  method: "POST",
		  uri: "https://test.payu.in/merchant/postservice.php?form=1",
		  form: {
			key: key,
			command: split_command,
			var1: mihpayid,
			hash: split_hash_value,
		  },
		};
		console.log("============================================split_req-options=================================", split_req_options)
	  
	  
		reqpost(options)
		  .on("response", function (resp:any) {
			console.log("STATUS:" + resp.statusCode);
			resp.setEncoding("utf8");
			resp.on("data", function (chunk:any) {
			  vdata = JSON.parse(chunk);
			  console.log("Verification Data", vdata)
			  if (vdata.status == "1") {
				details = vdata.transaction_details[txnid];
				console.log(details["status"] + "   " + details["mihpayid"]);
	  
				if (
				  details["status"] == "success" && details["mihpayid"] == mihpayid
				) {
				  verified = "Yes";
				  //Run the Split Payment API call here
				  reqpost(split_req_options)
					.on("response", function (resp:any) {
					  console.log("STATUS:" + resp.statusCode);
					  //resp.setEncoding("utf8");
					  resp.on("data", function (chunk:any) {
						console.log("BODY:" + chunk);
					  });
					})
					.on("error", function (err:any) {
					  console.log("ERROR:" + err);
					});
				} 
				else verified = "No";
				console.log("STATUS:" + resp.statusCode);
				res.render(__dirname + "/response.html", {
				  txnid: txnid,
				  amount: amount,
				  productinfo: productinfo,
				  additionalcharges: additionalcharges,
				  firstname: firstname,
				  email: email,
				  mihpayid: mihpayid,
				  status: status,
				  resphash: resphash,
				  msg: msg,
				  verified: verified,
				  splitRequest: splitRequest
				});
			  }
			});
		  })
		  .on("error", function (err:any) {
			console.log(err);
		  });

});

export default router;