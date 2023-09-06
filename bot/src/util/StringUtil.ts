export function wildcardMatch(pattern: string, str: string) {
    const regex = new RegExp('^' + pattern.split(/\*+/).map(regExpEscape).join('.*') + '$');
    return regex.test(str);
}

export function regExpEscape(literalString: string) {
    return literalString.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g, '\\$&');
}