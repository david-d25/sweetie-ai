export function getCookie(name: string): string | null {
    function escape(s: string) { return s.replace(/([.*+?^$(){}|\[\]\/\\])/g, '\\$1'); }
    const match = document.cookie.match(RegExp('(?:^|;\\s*)' + escape(name) + '=([^;]*)'));
    return match ? match[1] : null;
}
