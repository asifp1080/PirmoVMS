package com.vms.kiosk.ui

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import com.vms.kiosk.kiosk.KioskDeviceAdminReceiver
import com.vms.kiosk.ui.screens.AttractScreen
import com.vms.kiosk.ui.screens.CheckInFlowScreen
import com.vms.kiosk.ui.screens.CheckOutScreen
import com.vms.kiosk.ui.screens.OnboardingScreen
import com.vms.kiosk.ui.theme.VMSKioskTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponent: ComponentName

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize device policy manager for kiosk mode
        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, KioskDeviceAdminReceiver::class.java)

        // Setup kiosk mode
        setupKioskMode()

        setContent {
            VMSKioskTheme {
                val systemUiController = rememberSystemUiController()
                val isDarkTheme = false // TODO: Get from theme config

                LaunchedEffect(isDarkTheme) {
                    systemUiController.setSystemBarsColor(
                        color = androidx.compose.ui.graphics.Color.Transparent,
                        darkIcons = !isDarkTheme
                    )
                    systemUiController.isSystemBarsVisible = false
                }

                KioskApp(viewModel = viewModel)
            }
        }
    }

    private fun setupKioskMode() {
        // Keep screen on
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // Hide system UI
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE

        // Prevent status bar pull down
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )

        // Start lock task mode if device admin is enabled
        if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
            startLockTask()
        }
    }

    override fun onResume() {
        super.onResume()
        viewModel.onAppResumed()
    }

    override fun onPause() {
        super.onPause()
        viewModel.onAppPaused()
    }

    override fun onBackPressed() {
        // Disable back button in kiosk mode
        if (!devicePolicyManager.isDeviceOwnerApp(packageName)) {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
            stopLockTask()
        }
    }
}

@Composable
fun KioskApp(viewModel: MainViewModel) {
    val navController = rememberNavController()
    val uiState by viewModel.uiState.collectAsState()

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        NavHost(
            navController = navController,
            startDestination = if (uiState.isOnboarded) "attract" else "onboarding"
        ) {
            composable("onboarding") {
                OnboardingScreen(
                    onOnboardingComplete = {
                        navController.navigate("attract") {
                            popUpTo("onboarding") { inclusive = true }
                        }
                    }
                )
            }
            
            composable("attract") {
                AttractScreen(
                    onStartCheckIn = {
                        navController.navigate("checkin")
                    },
                    onStartCheckOut = {
                        navController.navigate("checkout")
                    }
                )
            }
            
            composable("checkin") {
                CheckInFlowScreen(
                    onComplete = {
                        navController.navigate("attract") {
                            popUpTo("attract") { inclusive = true }
                        }
                    },
                    onCancel = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable("checkout") {
                CheckOutScreen(
                    onComplete = {
                        navController.navigate("attract") {
                            popUpTo("attract") { inclusive = true }
                        }
                    },
                    onCancel = {
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}