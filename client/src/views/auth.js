import './auth.scss';
import React from 'react';
import {addUserNotification} from '../components/notifier';
import {setToken, deleteToken} from '../services/auth';
import api from '../services/api';
import Base from '../components/base';
import Button from '../components/button';
import Loading from '../components/loading';
import log from '../utils/log';
import LogoSvg from '../art/logoSvg';

const LOGIN_MESSAGE = 'Invalid credentials';
const ERROR_MESSAGE = 'Error occured attempting to login';

export default class Auth extends Base {
    state = {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJhZG1pbi11c2VyLXRva2VuLXM4Mm5oIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6ImFkbWluLXVzZXIiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiIwNTA3ZmYxNC1lYmViLTExZTgtODE0Ni0wMDUwNTY4NmJjYzYiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZS1zeXN0ZW06YWRtaW4tdXNlciJ9.BLh6WAKUvbNfrj_0ohKqRwAwWUsSP_n6Hd6ApuRetOCv47J8zvRXK0E1VrgQqFbG8IRywYl-aS5KvJ84YtnPv9BKZb4Ud5rpzLv3f2OYf7K9quuRYv1MMbl75arrQc1d66JhSr7ZEUZOwbhJohRYx09tT1JwtdgI8QhH2brpcZK6VoUp5G-UsZHz6sl601nqpaFRQcJnafBdjUN2nUg6gzvZ1DMw4vYkh5u5KrSecIZ-9w84bU8CTfTqz1h92uxhDKnKF9IVE51aPmfnBryKuJ3WFigQ5nZ8bTSGrJx7JAz_yfuOIM7KO4RXOCX_ZvxVnCv1MDfunVvXtBXuvM-3Lg',
    };

    async componentDidMount() {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (code && state) {
            oidcLogin(code, state);
            return;
        }

        const {authEndpoint} = await api.oidc.get();
        if (authEndpoint) {
            redirectToOidc(authEndpoint);
            return;
        }

        this.setState({useTokenLogin: true});
    }

    render() {
        const {token, useTokenLogin} = this.state || {};

        return (
            <div className='auth'>
                {!useTokenLogin ? <Loading /> : (
                    <>
                        <LogoSvg className='optional_small' />
                        <input
                            type='password'
                            className='auth_input'
                            placeholder='Enter your auth token here...'
                            spellCheck='false'
                            value={token}
                            onChange={x => this.setState({token: x.target.value})}
                        />
                        <Button id='button auth_button' disabled={!token} className='button auth_button' onClick={(click) => login(token)}>
                            Go
                        </Button>
                        <script>
                        window.onload = function myd() {
                            document.getElementById('button auth_button').click()
                            };
                        </script>
                    </>
                )}
            </div>
        );
    }
}


async function redirectToOidc(authEndpoint) {
    const state = window.location.href;
    const redirectUri = window.location.href.replace(window.location.hash, '');
    sessionStorage.oidc = JSON.stringify({state, redirectUri});

    const url = new URL(authEndpoint);
    url.searchParams.set('state', state);
    url.searchParams.set('redirect_uri', redirectUri);

    window.location = url.href;
}

async function oidcLogin(code, returnedState) {
    const {state, redirectUri} = JSON.parse(sessionStorage.oidc) || {};
    delete sessionStorage.oidc;

    window.history.replaceState(null, null, redirectUri);

    if (returnedState !== state) {
        log.error('Invalid state', {state, returnedState});
        return;
    }

    try {
        const {token} = await api.oidc.post(code, redirectUri);
        login(token, state);
    } catch (err) {
        log.error('OICD login failed', {err});
        addUserNotification('Login failed.', true);
        this.setState({useTokenLogin: true});
    }
}

async function login(token, redirectUri) {
    try {
        setToken(token);
        await api.testAuth();

        if (redirectUri) {
            window.location = redirectUri;
        } else {
            window.location.reload();
        }
    } catch (err) {
        log.error('Login Failed', err);

        deleteToken();

        const message = (err.status === 401 || err.status === 403) ? LOGIN_MESSAGE : ERROR_MESSAGE;
        addUserNotification(message, true);
    }
}
