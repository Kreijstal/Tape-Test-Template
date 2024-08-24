var test = require('tape');

function updateCompletionElement(message) {
  if (typeof document !== 'undefined') {
    var completionElement = document.getElementById('test-completion');
    if (completionElement) {
      completionElement.textContent = message;
      completionElement.style.display = 'block';
      console.log('Completion element updated:', message);
    } else {
      console.error('Completion element not found');
    }
  } else {
    console.log('Document not available, running in Node.js');
  }
}

test('Hello World', function (t) {
  console.log('Test started');
  t.plan(1);
  t.equal(2 + 2, 4, '2 + 2 should equal 4');
  console.log('Test assertion completed');
  
  t.on('end', function () {
    console.log('Test ended');
    updateCompletionElement('Tests completed successfully');
  });
});

// Ensure the completion element is updated even if there are no tests
setTimeout(function() {
  if (typeof document !== 'undefined' && document.getElementById('test-completion').style.display === 'none') {
    console.log('No tests ran, updating completion element');
    updateCompletionElement('No tests ran');
  }
}, 1000);
