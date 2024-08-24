var test = require('tape');
var testUtils = require('./testUtils');

test('Hello World', function (t) {
  console.log('Test started');
  t.plan(1);
  t.equal(2 + 2, 4, '2 + 2 should equal 4');
  console.log('Test assertion completed');
  
  t.on('end', function () {
    console.log('Test ended');
    testUtils.updateCompletionElement('Tests completed successfully');
  });
});

// Check if no tests ran
testUtils.checkNoTestsRan();
