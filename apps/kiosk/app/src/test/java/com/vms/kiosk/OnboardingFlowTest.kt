package com.vms.kiosk

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.vms.kiosk.data.model.*
import com.vms.kiosk.data.repository.KioskRepository
import com.vms.kiosk.ui.screens.OnboardingScreen
import com.vms.kiosk.ui.theme.VMSKioskTheme
import io.mockk.*
import kotlinx.coroutines.flow.flowOf
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OnboardingFlowTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private lateinit var mockRepository: KioskRepository
    private var onCompleteCallback: KioskConfig? = null

    @Before
    fun setup() {
        mockRepository = mockk()
        onCompleteCallback = null

        // Mock successful QR processing
        coEvery { mockRepository.processQRCode(any()) } returns Result.success(
            KioskConfig(
                deviceId = "test-device-001",
                locationId = "main-office",
                locationName = "Main Office",
                organizationId = "org-123",
                organizationName = "Test Organization",
                serverUrl = "https://api.vms.example.com",
                theme = "light",
                language = "en",
                features = mapOf(
                    "camera_enabled" to true,
                    "badge_printer" to false,
                    "offline_mode" to true
                )
            )
        )

        // Mock successful manual setup
        coEvery { mockRepository.validateManualSetup(any(), any(), any()) } returns Result.success(
            KioskConfig(
                deviceId = "manual-device-001",
                locationId = "branch-office",
                locationName = "Branch Office",
                organizationId = "org-123",
                organizationName = "Test Organization",
                serverUrl = "https://api.vms.example.com",
                theme = "light",
                language = "en",
                features = mapOf(
                    "camera_enabled" to true,
                    "badge_printer" to true,
                    "offline_mode" to true
                )
            )
        )

        // Mock config saving
        coEvery { mockRepository.saveKioskConfig(any()) } returns Result.success(Unit)
    }

    @Test
    fun onboardingFlow_qrCodePath_completesSuccessfully() {
        composeTestRule.setContent {
            VMSKioskTheme {
                OnboardingScreen(
                    repository = mockRepository,
                    onComplete = { config -> onCompleteCallback = config }
                )
            }
        }

        // Step 1: Welcome screen
        composeTestRule
            .onNodeWithText("Welcome to VMS Kiosk")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Get Started")
            .performClick()

        // Step 2: QR Scan screen
        composeTestRule
            .onNodeWithText("Scan Setup QR Code")
            .assertIsDisplayed()

        // Simulate QR scan
        composeTestRule
            .onNodeWithText("Tap to simulate QR scan")
            .performClick()

        // Should show downloading/processing
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            composeTestRule
                .onAllNodesWithText("Setting Up Kiosk")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Should eventually show success
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            composeTestRule
                .onAllNodesWithText("Setup Complete!")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule
            .onNodeWithText("Setup Complete!")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Test Organization")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Main Office")
            .assertIsDisplayed()

        // Complete onboarding
        composeTestRule
            .onNodeWithText("Start Kiosk")
            .performClick()

        // Verify completion callback
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            onCompleteCallback != null
        }

        assert(onCompleteCallback?.deviceId == "test-device-001")
        assert(onCompleteCallback?.locationName == "Main Office")
        assert(onCompleteCallback?.organizationName == "Test Organization")

        // Verify config was saved
        coVerify { mockRepository.saveKioskConfig(any()) }
    }

    @Test
    fun onboardingFlow_manualSetupPath_completesSuccessfully() {
        composeTestRule.setContent {
            VMSKioskTheme {
                OnboardingScreen(
                    repository = mockRepository,
                    onComplete = { config -> onCompleteCallback = config }
                )
            }
        }

        // Navigate to QR scan
        composeTestRule.onNodeWithText("Get Started").performClick()

        // Choose manual setup
        composeTestRule
            .onNodeWithText("Manual Setup Instead")
            .performClick()

        // Should show manual setup form
        composeTestRule
            .onNodeWithText("Manual Setup")
            .assertIsDisplayed()

        // Fill out form
        composeTestRule
            .onNodeWithText("Server URL")
            .performTextInput("https://api.vms.example.com")

        composeTestRule
            .onNodeWithText("Device ID")
            .performTextInput("manual-device-001")

        composeTestRule
            .onNodeWithText("Location ID")
            .performTextInput("branch-office")

        // Complete setup
        composeTestRule
            .onNodeWithText("Complete Setup")
            .performClick()

        // Should show success
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            composeTestRule
                .onAllNodesWithText("Setup Complete!")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule
            .onNodeWithText("Branch Office")
            .assertIsDisplayed()

        // Complete onboarding
        composeTestRule
            .onNodeWithText("Start Kiosk")
            .performClick()

        // Verify completion
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            onCompleteCallback != null
        }

        assert(onCompleteCallback?.deviceId == "manual-device-001")
        assert(onCompleteCallback?.locationName == "Branch Office")

        // Verify manual setup was called
        coVerify { 
            mockRepository.validateManualSetup(
                "https://api.vms.example.com",
                "manual-device-001",
                "branch-office"
            ) 
        }
    }

    @Test
    fun onboardingFlow_qrCodeFailure_showsErrorAndRetry() {
        // Mock QR processing failure
        coEvery { mockRepository.processQRCode(any()) } returns Result.failure(
            Exception("Invalid QR code")
        )

        composeTestRule.setContent {
            VMSKioskTheme {
                OnboardingScreen(
                    repository = mockRepository,
                    onComplete = { config -> onCompleteCallback = config }
                )
            }
        }

        // Navigate to QR scan and simulate scan
        composeTestRule.onNodeWithText("Get Started").performClick()
        composeTestRule.onNodeWithText("Tap to simulate QR scan").performClick()

        // Should show error dialog
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            composeTestRule
                .onAllNodesWithText("Setup Failed")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule
            .onNodeWithText("Setup Failed")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Invalid QR code")
            .assertIsDisplayed()

        // Should have retry option
        composeTestRule
            .onNodeWithText("Retry")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Cancel")
            .assertIsDisplayed()
    }

    @Test
    fun onboardingFlow_manualSetupValidation() {
        composeTestRule.setContent {
            VMSKioskTheme {
                OnboardingScreen(
                    repository = mockRepository,
                    onComplete = { config -> onCompleteCallback = config }
                )
            }
        }

        // Navigate to manual setup
        composeTestRule.onNodeWithText("Get Started").performClick()
        composeTestRule.onNodeWithText("Manual Setup Instead").performClick()

        // Complete Setup button should be disabled initially
        composeTestRule
            .onNodeWithText("Complete Setup")
            .assertIsNotEnabled()

        // Fill only server URL
        composeTestRule
            .onNodeWithText("Server URL")
            .performTextInput("https://api.vms.example.com")

        // Still disabled
        composeTestRule
            .onNodeWithText("Complete Setup")
            .assertIsNotEnabled()

        // Fill device ID
        composeTestRule
            .onNodeWithText("Device ID")
            .performTextInput("device-001")

        // Still disabled
        composeTestRule
            .onNodeWithText("Complete Setup")
            .assertIsNotEnabled()

        // Fill location ID
        composeTestRule
            .onNodeWithText("Location ID")
            .performTextInput("main-office")

        // Now should be enabled
        composeTestRule
            .onNodeWithText("Complete Setup")
            .assertIsEnabled()
    }

    @Test
    fun onboardingFlow_configPersistence() {
        val expectedConfig = KioskConfig(
            deviceId = "test-device-001",
            locationId = "main-office",
            locationName = "Main Office",
            organizationId = "org-123",
            organizationName = "Test Organization",
            serverUrl = "https://api.vms.example.com",
            theme = "light",
            language = "en",
            features = mapOf("camera_enabled" to true)
        )

        composeTestRule.setContent {
            VMSKioskTheme {
                OnboardingScreen(
                    repository = mockRepository,
                    onComplete = { config -> onCompleteCallback = config }
                )
            }
        }

        // Complete QR flow
        composeTestRule.onNodeWithText("Get Started").performClick()
        composeTestRule.onNodeWithText("Tap to simulate QR scan").performClick()

        // Wait for completion
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            composeTestRule
                .onAllNodesWithText("Start Kiosk")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule.onNodeWithText("Start Kiosk").performClick()

        // Verify config was saved with correct data
        coVerify { 
            mockRepository.saveKioskConfig(
                match { config ->
                    config.deviceId == expectedConfig.deviceId &&
                    config.locationName == expectedConfig.locationName &&
                    config.organizationName == expectedConfig.organizationName
                }
            )
        }
    }

    @Test
    fun onboardingFlow_progressIndicator() {
        composeTestRule.setContent {
            VMSKioskTheme {
                OnboardingScreen(
                    repository = mockRepository,
                    onComplete = { config -> onCompleteCallback = config }
                )
            }
        }

        // Navigate to QR scan and simulate scan
        composeTestRule.onNodeWithText("Get Started").performClick()
        composeTestRule.onNodeWithText("Tap to simulate QR scan").performClick()

        // Should show progress during setup
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            composeTestRule
                .onAllNodesWithText("Setting Up Kiosk")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Should show progress indicator
        composeTestRule
            .onNode(hasProgressBarRangeInfo(ProgressBarRangeInfo.Indeterminate))
            .assertExists()
    }

    @Test
    fun onboardingFlow_attractScreenTransition() {
        // This test verifies the transition from onboarding to attract screen
        var transitionedToAttract = false

        composeTestRule.setContent {
            VMSKioskTheme {
                if (onCompleteCallback == null) {
                    OnboardingScreen(
                        repository = mockRepository,
                        onComplete = { config -> 
                            onCompleteCallback = config
                            transitionedToAttract = true
                        }
                    )
                } else {
                    // Simulate attract screen
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Welcome to Our Office")
                    }
                }
            }
        }

        // Complete onboarding
        composeTestRule.onNodeWithText("Get Started").performClick()
        composeTestRule.onNodeWithText("Tap to simulate QR scan").performClick()

        composeTestRule.waitUntil(timeoutMillis = 5000) {
            composeTestRule
                .onAllNodesWithText("Start Kiosk")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule.onNodeWithText("Start Kiosk").performClick()

        // Should transition to attract screen
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            transitionedToAttract
        }

        // Verify we're now on attract screen
        composeTestRule
            .onNodeWithText("Welcome to Our Office")
            .assertIsDisplayed()
    }
}