package com.vms.kiosk.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = VMSPrimary,
    secondary = VMSSecondary,
    tertiary = Pink80,
    background = VMSGray900,
    surface = VMSGray800,
    onPrimary = VMSGray50,
    onSecondary = VMSGray50,
    onTertiary = VMSGray50,
    onBackground = VMSGray50,
    onSurface = VMSGray50,
    error = VMSError,
    onError = VMSGray50
)

private val LightColorScheme = lightColorScheme(
    primary = VMSPrimary,
    secondary = VMSSecondary,
    tertiary = Pink40,
    background = VMSGray50,
    surface = VMSGray100,
    onPrimary = VMSGray50,
    onSecondary = VMSGray50,
    onTertiary = VMSGray50,
    onBackground = VMSGray900,
    onSurface = VMSGray900,
    error = VMSError,
    onError = VMSGray50
)

@Composable
fun VMSKioskTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color is available on Android 12+
    dynamicColor: Boolean = false, // Disabled for consistent branding
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}