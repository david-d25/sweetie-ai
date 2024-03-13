import React, {StrictMode} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';

import {RecoilRoot} from "recoil";

import "@/style/global.scss";
import "@/style/theme-light.scss";
import "@/style/theme-dark.scss";
import Login from "./page/Login/Login";
import Dashboard from "./page/Dashboard/Dashboard";
import UserProfile from "./page/UserProfile/UserProfile";
import Chat from "./page/Chat/Chat";
import NotFound from "./page/NotFound/NotFound";
import ThemeInit from "./component/ThemeInit/ThemeInit";
import Header from "./component/Header/Header";

export default function App() {
    return (
        <StrictMode>
            <RecoilRoot>
                <ThemeInit/>
                <BrowserRouter basename={process.env['FRONTEND_BASE_PATH']}>
                    <Header/>
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" replace/>}/>
                        <Route path="/login" element={<Login/>}/>
                        <Route path="/dashboard" element={<Dashboard/>}/>
                        <Route path="/user" element={<UserProfile/>}/>
                        <Route path="/chat/:id" element={<Chat/>}/>
                        <Route path="*" element={<NotFound/>}/>
                    </Routes>
                </BrowserRouter>
            </RecoilRoot>
        </StrictMode>
    )
}