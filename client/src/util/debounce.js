export function debounce(fn, delay = 100) {
    let timerId;
    return function (...args) {
        const context = this;
        clearTimeout(timerId);
        timerId = setTimeout(() => fn.apply(context, args), delay);
    };
}
