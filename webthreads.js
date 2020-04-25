// Copyright 2020 Joshua J Baker. All rights reserved.
// Use of this source code is governed by an MIT-style
// license that can be found in the LICENSE file.

const spawn = (function(){
    function worker() {
        function exit(r) {
            let transfer = []
            if (typeof ret === ArrayBuffer) {
                transfer = [r];
            } else if (typeof r === Array) {
                for (let i = 0; i < r.length; i++) {
                    if (typeof r[i] === ArrayBuffer) {
                        transfer.push(r[i])
                    }
                }
            }
            postMessage({ ok: true, v: r}, transfer);
        }
        let queue = [];
        let resolvers = [];
        function recv(resolve) {
            if (queue.length){
                resolve(...queue.shift());
            } else {
                resolvers.push(resolve);
            }
        }
        function send() {
            let args = [];
            let transfer = [];
            for (let i = 0; i < arguments.length;i++) {
                let arg = arguments[i];
                if (typeof arg === ArrayBuffer) {
                    transfer.push(arg);
                }
                args.push(arg);
            }
            postMessage({ msg: true, args: args }, transfer);
        }
        function Thread(){}
        let t = new Thread();
        t.__proto__ = null;
        t.send = send;
        t.recv = recv;
        t.exit = exit;
        onmessage = function(e) {
            if (e.data.call) {
                try {
                    let importScripts, onmessage, onmessageerror;
                    let postMessage, name, close, Worker;
                    let self = t;
                    FUNC.call(t, ...e.data.args);
                } catch (e) {
                    try {
                        postMessage({ ok: false, v: e });
                    } catch (e2) {
                        if (e instanceof Error) {
                            e = {
                                name: e.name.toString(),
                                message: e.message.toString(),
                                stack: e.stack.toString(),
                            }
                            postMessage({ ok: false, e: true, v: e });
                        } else {
                            postMessage({ ok: false, v: e.toString() });
                        }
                    }
                    
                }
            } else if (e.data.msg) {
                if (resolvers.length) {
                    resolvers.shift()(...e.data.args);
                } else {
                    queue.push(e.data.args);
                }
            }
        }
    }

    function Thread(){}
    let cache = new Map();
    function spawn(fn) {
        let waitResolve, waitReject;
        return new Promise((resolve, reject) => {
            if (typeof fn !== "function") {
                throw new Error("not a function");
            }
            let blobURL = cache.get(fn);
            if (!blobURL) {
                blobURL = URL.createObjectURL(new Blob([
                    ("("+worker+")()").replace("FUNC","(\n"+fn+"\n)"),
                ]));
                cache.set(fn, blobURL)
            }
            let queue = [];
            let resolvers = [];
            let w = new Worker(blobURL);
            w.onmessage = function(e) {
                if (e.data.ok) {
                    w.terminate();
                    if (waitResolve) {
                        waitResolve(e.data.v);
                    }
                } else if (e.data.msg) {
                    if (resolvers.length) {
                        resolvers.shift()(...e.data.args);
                    } else {
                        queue.push(e.data.args);
                    }
                } else {
                    w.terminate();
                    let v;
                    if (e.data.e) {
                        v = new Error(e.data.v.message);
                        v.name = e.data.v.name;
                        v.stack = e.data.v.stack
                    } else {
                        v = e.data.v
                    }
                    if (waitReject){ 
                        waitReject(v);
                    } else {
                        throw v;
                    }
                }
            };
            let args = [];
            let transfer = [];
            for (let i = 1; i < arguments.length;i++) {
                let arg = arguments[i];
                if (typeof arg === ArrayBuffer) {
                    transfer.push(arg);
                }
                args.push(arg);
            }
            w.postMessage({call:true,args:args}, transfer);
            let t = new Thread();
            t.__proto__ = null;
            t.send = function() {
                let args = [];
                let transfer = [];
                for (let i = 0; i < arguments.length;i++) {
                    let arg = arguments[i];
                    if (typeof arg === ArrayBuffer) {
                        transfer.push(arg);
                    }
                    args.push(arg);
                }
                w.postMessage({ msg: true, args: args }, transfer);
            }
            t.recv = function(resolve) {
                if (queue.length){
                    resolve(...queue.shift());
                } else {
                    resolvers.push(resolve);
                }   
            }
            t.wait = function(timeout) {
                return new Promise((resolve, reject) => {
                    waitResolve = resolve;
                    waitReject = reject;
                })
            }
            resolve(t);
        });
    }
    return spawn;
})();
