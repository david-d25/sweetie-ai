import {useEffect} from "react";
import {useRecoilState} from "recoil";
import {themeState} from "../../state/themeState";

export default function ThemeInit() {
    const [theme, setTheme] = useRecoilState(themeState);

    useEffect(() => {
        let themeToUse = 'light';

        if (window.matchMedia) {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches)
                themeToUse = 'dark';
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
                setTheme(event.matches ? "dark" : "light");
            });
        }

        const savedTheme = localStorage.getItem("theme");
        if (savedTheme)
            themeToUse = savedTheme;

        setTheme(themeToUse);
    }, []);

    useEffect(() => {
        if (theme) {
            document.body.setAttribute("data-theme", theme);
            localStorage.setItem("theme", theme);
        }
    }, [theme]);

    return null;
}