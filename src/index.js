// Copyright Daniel Horbury 2017

'use strict';

var request = require('request');
var Speech = require('ssml-builder');
var cheerio = require('cheerio');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
	try {
		console.log("event.session.application.applicationId=" + event.session.application.applicationId);

		//only accept requests from my skill 
		 
	if (event.session.application.applicationId !== "amzn1.ask.skill.7fc27df6-5394-45d1-95ff-8cd7e814ec41") {
		context.fail("Invalid Application ID");
	 }

		if (event.session.new) {
			onSessionStarted({requestId: event.request.requestId}, event.session);
		}

		if (event.request.type === "LaunchRequest") {
			onLaunch(event.request,
				event.session,
				function callback(sessionAttributes, speechletResponse) {
					context.succeed(buildResponse(sessionAttributes, speechletResponse));
				});
		} else if (event.request.type === "IntentRequest") {
			onIntent(event.request,
				event.session,
				function callback(sessionAttributes, speechletResponse) {
					context.succeed(buildResponse(sessionAttributes, speechletResponse));
				});
		} else if (event.request.type === "SessionEndedRequest") {
			onSessionEnded(event.request, event.session);
			context.succeed();
		}
	} catch (e) {
		context.fail("Exception: " + e);
	}
};


function onSessionStarted(sessionStartedRequest, session) {
	console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
		+ ", sessionId=" + session.sessionId);
}

function getHelpMsg(){
	var speech = new Speech();
	speech.say("You can ask WikiQuote of the day to tell you the quote of the day.");
	speech.pause('200ms');
	speech.say("For example");
	speech.pause('200ms');
	speech.say("ask WikiQuote of the day"); 
	speech.say("to tell me the quote of the day.");
	
	var speechOutput = "<speak>" + speech.ssml(true) + "</speak>";
	return speechOutput;
}

//Skill launched without any intent
function onLaunch(launchRequest, session, callback) {
	console.log("onLaunch requestId=" + launchRequest.requestId
		+ ", sessionId=" + session.sessionId);
	
	callback(session.attributes,
		buildSpeechletResponseWithoutCard(getHelpMsg(), "Request now", false));
}

//specific intent
function onIntent(intentRequest, session, callback) {
	console.log("onIntent requestId=" + intentRequest.requestId
		+ ", sessionId=" + session.sessionId);

	var intent = intentRequest.intent,
		intentName = intentRequest.intent.name;

	// if the user asks for a quote, happy days, lets get them one
	if (intentName == 'RequestQuote') {
		handleQuoteRequest(intent, session, callback);
	} else if (intentName == 'AMAZON.HelpIntent') {
		callback(session.attributes,
			buildSpeechletResponseWithoutCard(getHelpMsg(), "Request now", false));
	} else if (intentName == 'AMAZON.CancelIntent') {
		callback(session.attributes,
			buildSpeechletResponseWithoutCard("", "", true));
	} else if (intentName == 'AMAZON.StopIntent') {
		callback(session.attributes,
			buildSpeechletResponseWithoutCard("", "", true));
	} else {
		throw "Invalid intent";
	}
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
	console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
		+ ", sessionId=" + session.sessionId);

}

//get the joke and send it to the response maker
function handleQuoteRequest(intent, session, callback) {

	var options = {
	  url: 'https://en.wikiquote.org/wiki/Main_Page',
	};

	request(options, function (error, response, html) {
	
	  var $html = cheerio.load(html);
	  
	  var $quote = $html('td', '#mf-qotd').children().first().children().first().children().eq(2).children().first().children();
	  var quote = $quote.first().text();
	  var author = $quote.eq(1).children().first().children().first().text();
	  
	  var speech = new Speech();
	  
	  speech.say(author + " once said.");
	  speech.pause('100ms');
	  speech.say(quote);
	  
	  var speechOutput = "<speak>" + speech.ssml(true) + "</speak>";
	  
	  console.log(speechOutput);

	  callback(session.attributes,
		buildSpeechletResponseWithoutCard(speechOutput, "", "true"));
	});

	
}

// ------- Helper functions to build responses -------



function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
	return {
		outputSpeech: {
			type: "SSML",
			ssml: output
		},
		reprompt: {
			outputSpeech: {
				type: "PlainText",
				text: repromptText
			}
		},
		shouldEndSession: shouldEndSession
	};
}

function buildResponse(sessionAttributes, speechletResponse) {
	return {
		version: "1.0",
		sessionAttributes: sessionAttributes,
		response: speechletResponse
	};
}