var Lexer = require('./lexer');
var LexerRuleset = require('./lexerRuleset');
var Parser = require('./parser');
var fs = require('fs');

var lexer = new Lexer();
var ruleset = new LexerRuleset();
var source = fs.readFileSync("test.hc").toString();

function parse(tokens)
{
  // console.log(tokens);
  var bcode = []; 
  var lineEnded = true;
  var twice = false;
  var i = 0;
  var scopes = [];
  var loopExprs = [];
  while(i < tokens.length)
  {
    if (!lineEnded)
    {
      if (tokens[i].type != "NOTHING")
      {
        
        if (tokens[i].type == "LINE_END")
        {
          lineEnded = true;
        }
        else
        {
          console.error("ParseError: Unexpected token "+tokens[i].label);
          process.exit(-1);
        }
      }
      
    }
    if (tokens[i].type == "LINE_END")
    {
      i++;
      continue;
    }
    
    if (tokens[i].type == "DIR" && tokens[i].label == "~twice")
    {
      i = i+1;
      bcode.push(["TWICE"])
      continue;
    }
    if (tokens[i].type == "DIR" && tokens[i].label == "~repeat")
    {
      if (tokens[i+2].type == "ALIAS")
      {
        var expr = parseExpr(tokens, i+1);
        bcode.push(["DECLARE", tokens[i+3].label])

        bcode.push(["LODNUM", -1])
        bcode.push(["SET", tokens[i+3].label])

        loopExprs.push(expr.bc);
        bcode.push(["REPEAT"])

        scopes.push(bcode.length-1);

        bcode.push(["LODNUM", 1])
        bcode.push(["ADD", tokens[i+3].label])

        i = i+4;

      }
      else
      {
        var expr = parseExpr(tokens, i+1);
        loopExprs.push(expr.bc);

        bcode.push(["REPEAT"])

        scopes.push(bcode.length-1);
        i = i+2;

      }
      continue;
    }
    if (tokens[i].type == "DIR" && tokens[i].label == "~reset")
    {
      bcode.push(["RESET"]);
      i = i+1;
      continue;
    }
    if (tokens[i].type == "DIR" && tokens[i].label == "~quit")
    {
      bcode = bcode.concat(loopExprs.pop());

      bcode.push(["JC", scopes.pop()]);
      i = i+1;
      continue;
    }
    if (tokens[i].type == "DECLARE")
    {

      var r = parseExpr(tokens, i+3);
      bcode.push(["DECLARE", tokens[i+1].label]);
      bcode = bcode.concat(r.bc);
      bcode.push(["SET", tokens[i+1].label]);
      i = r.index;

      // i = i+1;
      continue;
    }
    if (tokens[i].type == "IDENTIFIER")
    {
      if (tokens[i+1].label == "=")
      {
        var r = parseExpr(tokens, i+2);
        bcode = bcode.concat(r.bc);
        
        bcode.push(["SET", tokens[i].label]);
        i = r.index;
      }
      else if (tokens[i+1].label == "+=")
      {
        var r = parseExpr(tokens, i+2);
        bcode = bcode.concat(r.bc);
        
        bcode.push(["ADD", tokens[i].label]);
        i = r.index;
      }
      i = i+1;
      continue;
    }
    if (tokens[i].type == "PRINT" || tokens[i].type == "PRINTN" )
    {
      var r = parseFunction(tokens, i);
      i = r.index;
      console.log(i);
      bcode = bcode.concat(r.bc);
      
      lineEnded = false;
    }
  }
  return bcode;
}

function parseVariable(tokens, index)
{

}

function parseExpr(tokens, index)
{
  var byteCode = [];
  var rttokens = tokens.slice(index);

  if (rttokens[0].type == "IDENTIFIER")
  {
    byteCode.push(["LODID", rttokens[0].label])
  }
  if (rttokens[0].type == "STRING")
  {
    byteCode.push(["LODSTR", rttokens[0].label.substr(1, rttokens[0].label.length-2)])
  }
  if (rttokens[0].type == "DIGIT")
  {
    byteCode.push(["LODNUM", rttokens[0].label])
  }
  return {bc: byteCode, index: index + 1};
}

function parseFunction(tokens, index)
{
  var byteCode = [];
  var rttokens = tokens.slice(index);
  
  if (rttokens[0].type == "PRINT")
  {
    var r = parseExpr(tokens, index+2);
    index = r.index;
    console.log(r.index);

    byteCode = byteCode.concat(r.bc);
    byteCode.push(["PRINT"]);
  }
  if (rttokens[0].type == "PRINTN")
  {
    var r = parseExpr(tokens, index+2);

    byteCode = byteCode.concat(r.bc);
    
    index = r.index;

    byteCode.push(["PRINTN"]);
  }
  return {bc: byteCode, index: index+1};
}

function evalBytecode(bcode)
{
  var loaded;
  var counters = [];
  var declarations = {};
  var i = 0;
  while (i < bcode.length)
  {
    if (bcode[i][0] == "TWICE")
    {
      repeat.push(repeat[repeat.length-1]);
    }
    if (bcode[i][0] == "REPEAT")
    {
      counters.push(0);
    }

    if (bcode[i][0] == "LODID")
    {
      loaded = declarations[bcode[i][1]];
    }
    if (bcode[i][0] == "LODSTR")
    {
      loaded = bcode[i][1];

    }
    if (bcode[i][0] == "LODNUM")
    {
      loaded = parseInt(bcode[i][1]);

    }

    if (bcode[i][0] == "JC")
    {
      if (counters[counters.length-1] < loaded-1)
      {
        counters[counters.length-1]++;
        i = parseInt(bcode[i][1])+1;
      }
      else
      {
        i++;
        counters.pop();

      }
      continue;
      
    }
    if (bcode[i][0] == "DECLARE")
    {
      declarations[bcode[i][1]] = undefined;

    }

    if (bcode[i][0] == "SET")
    {
      declarations[bcode[i][1]] = loaded;

    }
    if (bcode[i][0] == "ADD")
    {
      declarations[bcode[i][1]] += loaded;

    }
    if (bcode[i][0] == "PRINT")
    {
      console.log(loaded);

    }
    if (bcode[i][0] == "PRINTN")
    {
      process.stdout.write(""+loaded);

    }
    i++;
  }
}

ruleset.add(/\~[a-zA-Z]+/g, 'DIR');
ruleset.add(/[1234567890]+/g, 'DIGIT');
ruleset.add(/\/\/[^\n]+/g, 'NOTHING');
ruleset.add(/\n/g, 'NOTHING');
ruleset.add(/\s/g, 'NOTHING');

ruleset.add(/\(/g, 'OPEN_PARENTHESES');
ruleset.add(/\)/g, 'CLOSE_PARENTHESES');
ruleset.add(/;/g, 'LINE_END');

ruleset.add(/printn/g, 'PRINTN');
ruleset.add(/print/g, 'PRINT');
ruleset.add(/as(?![a-zA-Z])/g, 'ALIAS');

ruleset.add(/\`.*\`/g, 'STRING');

ruleset.add(/def/g, 'DECLARE');

ruleset.add(/\+\=/g, 'ADD_TO');
ruleset.add(/\=/g, 'ASSIGN');

ruleset.add(/[a-zA-Z]+/g, 'IDENTIFIER');

var lexems = lexer.lex(ruleset, source);

console.log(lexems);
var bcode = parse(lexems);

console.log("========BYTECODE========");
console.log(bcode);
console.log("=====PROGRAM STARTED====");



evalBytecode(bcode);
// console.log(lexer.lex(ruleset, source));