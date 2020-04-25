# WebThreads

Threads in Javascript

## Using

Call the `spawn()` function to start a new child thread which runs completely in the background.

```js
function myThread() {
    // ... do something that is cpu intensive
    exit();
}

spawn(myThread)
.then(t => {
    // ... the thread has been started. Wait for it to exit.
    return t.wait()
}).then(() => {
    // thread has cleanly exited
})
```

### Sending arguments to the thread

A child thread can accept arguments and return a value, just a like a normal function.

```js
function add(a, b) {
    exit(a+b);
}

spawn(add, 1, 2)         // call the thread
.then(t => t.wait())        // wait for the thread to exit
.then(r => console.log(r))  // print the return value

// output:
// 3
```

### Variable cloning

Because a child thread cannot directly share data with the main thread, all data sent between the two must be cloned. This includes arguments, return values, or data sent using `send()` and `recv()`. This data may be any value or JavaScript object handled by the 
[structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm), which includes cyclical references. The one exception is `ArrayBuffer`, which has it's ownership automatically transfered instead of cloned.

### Communicating with the thread

Each child thread opens a channel with the main thread. You can use this channel to send and receive data using the `send()` and `recv()` methods.

```js
function thread() {
    recv(x => {
        console.log(x);
        send("hi");
        recv(x => {
            if (x == "end") {
                exit();
            }
        })
    })
}

spawn(thread)
.then(t => {
    t.send("hello");
    t.recv(x => {
        console.log(x);
        t.send("end");
    })
    return t.wait();
})
.then(() => console.log("done"))

// output:
// hello
// hi
// done

```

### Handling errors

When an error occurs the thread is immediately exited. The error can be caught like such.

```js
function thread() {
    throw new Error("bad news");
}

spawn(thread)
.then(t => t.wait())
.then(r => console.log("done")) // this is not called
.catch(e => console.error(e))

// output:
// Error: bad news

```

## Contact

Josh Baker [@tidwall](http://twitter.com/tidwall)

## License

Source code is available under the MIT [License](/LICENSE).
