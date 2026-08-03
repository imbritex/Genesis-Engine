import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, StatusBar, Platform, Text, AppState, AppStateStatus } from 'react-native';
import { WebView } from 'react-native-webview';
import { registerRootComponent } from 'expo';
import Constants from 'expo-constants';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';

const App = () => {
  const [url, setUrl] = useState('');
  const webViewRef = useRef<WebView>(null);
  const appState = useRef(AppState.currentState);

  // ==========================================
  // 1. CONTROL TOTAL DE LA INTERFAZ
  // ==========================================
  const hideSystemUI = async () => {
    StatusBar.setHidden(true, 'fade');
    if (Platform.OS === 'android') {
      try {
        await NavigationBar.setVisibilityAsync("hidden");
      } catch (e) {
        console.log("Error ocultando NavigationBar", e);
      }
    }
  };

  const showSystemUI = async () => {
    StatusBar.setHidden(false, 'fade');
    if (Platform.OS === 'android') {
      try {
        await NavigationBar.setVisibilityAsync("visible");
      } catch (e) {
        console.log("Error mostrando NavigationBar", e);
      }
    }
  };

  // ==========================================
  // 2. GESTIÓN DE ESTADO Y VISIBILIDAD CON DELAY
  // ==========================================
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('\x1b[32mApp activa - Restaurando interfaz y motor\x1b[0m');

        // 1. Muestra la interfaz al entrar para sincronizar el estado de Android
        showSystemUI();

        // 2. Espera 500ms y fuerza la ocultación
        setTimeout(async () => {
          await hideSystemUI();
        }, 500);

        webViewRef.current?.injectJavaScript(`
          if (window.game) {
            if (window.game.loop) window.game.loop.wake();
            if (window.game.sound) {
              window.game.sound.mute = false;
              if (window.game.sound.context) window.game.sound.context.resume();
            }
          }
          true;
        `);
      }
      else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('\x1b[31mApp en segundo plano\x1b[0m');
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // ==========================================
  // 3. CONFIGURACIÓN INICIAL
  // ==========================================
  useEffect(() => {
    const prepareUI = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      await hideSystemUI();
    };
    prepareUI();

    let host = "127.0.0.1";
    if (Constants?.expoConfig?.hostUri) {
      host = Constants.expoConfig.hostUri.split(":")[0];
    }

    const targetUrl = `http://${host}:8081/engine/index.html`;
    setUrl(targetUrl);
  }, []);

  // ==========================================
  // 4. INTÉRPRETE ANSI PARA TERMINAL
  // ==========================================
  const applyAnsiStyles = (msg: string, args: string[]) => {
    let formattedMsg = msg;
    let argIndex = 1;

    const styleMap: { [key: string]: string } = {
      'background: #ff0000': '\x1b[41m',
      'background: #ffff00': '\x1b[43m',
      'background: #00ff00': '\x1b[42m',
      'background: #00ffff': '\x1b[46m',
      'background: #000000': '\x1b[40m',
      'background: purple': '\x1b[45m',
      'color: #ffffff': '\x1b[37m',
      'color: white': '\x1b[37m',
      'color: unset': '\x1b[0m',
      'transparent': '\x1b[0m'
    };

    if (typeof formattedMsg === 'string' && formattedMsg.includes('%c')) {
      while (formattedMsg.includes('%c') && argIndex < args.length) {
        let style = args[argIndex].toLowerCase();
        let ansi = '\x1b[0m';

        for (const [key, value] of Object.entries(styleMap)) {
          if (style.includes(key)) {
            ansi = value;
            break;
          }
        }
        formattedMsg = formattedMsg.replace('%c', ansi);
        argIndex++;
      }
    }

    let finalOutput = formattedMsg;
    for (let i = argIndex; i < args.length; i++) {
      finalOutput += ' ' + args[i];
    }
    return finalOutput + '\x1b[0m';
  };

  if (!url) return <View style={styles.loadingContainer}><Text style={{color: 'white'}}>Cargando...</Text></View>;

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} translucent={true} />
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'log' || data.type === 'warn' || data.type === 'error') {
              const output = applyAnsiStyles(data.args[0], data.args);
              if (data.type === 'error') console.error(output);
              else if (data.type === 'warn') console.warn(output);
              else console.log(output);
            }
          } catch(e) {
            console.log(event.nativeEvent.data);
          }
        }}
        injectedJavaScript={`
          window.isReactNative = true;

          const sendLog = (type, args) => {
            const parsedArgs = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a));
            window.ReactNativeWebView.postMessage(JSON.stringify({ type, args: parsedArgs }));
          };
          window.console.log = function(){ sendLog('log', arguments); };
          window.console.warn = function(){ sendLog('warn', arguments); };
          window.console.error = function(){ sendLog('error', arguments); };

          document.addEventListener("visibilitychange", function() {
            const g = window.game;
            if (!g) return;

            if (document.hidden) {
              if (g.loop) g.loop.sleep();
              if (g.sound) {
                g.sound.mute = true;
                if (g.sound.context) g.sound.context.suspend();
              }
            } else {
              if (g.loop) g.loop.wake();
              if (g.sound) {
                g.sound.mute = false;
                if (g.sound.context) g.sound.context.resume();
              }
            }
          });
          true;
        `}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  webview: { flex: 1, backgroundColor: '#000000' }
});

registerRootComponent(App);
export default App;
