package com.vms.kiosk

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.vms.kiosk.data.model.*
import com.vms.kiosk.data.repository.KioskRepository
import com.vms.kiosk.ui.screens.CheckInFlowScreen
import com.vms.kiosk.ui.theme.VMSKioskTheme
import io.mockk.*
import kotlinx.coroutines.flow.flowOf
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CheckInFlowCompleteTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private lateinit var mockRepository: KioskRepository
    private var onCompleteCallback: Visit? = null
    private var onCancelCallback = false

    @Before
    fun setup() {
        mockRepository = mockk()
        onCompleteCallback = null
        onCancelCallback = false

        // Mock successful submission
        coEvery { mockRepository.submitVisit(any()) } returns Result.success(
            Visit(
                id = "test-visit-id",
                locationId = "test-location",
                purpose = VisitPurpose.MEETING,
                firstName = "John",
                lastName = "Doe",
                email = "john.doe@example.com",
                company = "Test Corp",
                status = VisitStatus.PENDING,
                qrCode = "QR-12345"
            )
        )

        // Mock hosts
        every { mockRepository.getHosts() } returns flowOf(
            listOf(
                Host(
                    id = "host-1",
                    firstName = "Jane",
                    lastName = "Smith",
                    department = "Engineering",
                    photoUrl = null
                ),
                Host(
                    id = "host-2",
                    firstName = "Bob",
                    lastName = "Wilson",
                    department = "Sales",
                    photoUrl = null
                )
            )
        )
    }

    @Test
    fun completeCheckInFlow_successfulSubmission() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    repository = mockRepository,
                    onComplete = { visit -> onCompleteCallback = visit },
                    onCancel = { onCancelCallback = true }
                )
            }
        }

        // Step 1: Language Selection
        composeTestRule
            .onNodeWithText("English")
            .assertIsDisplayed()
            .performClick()

        composeTestRule
            .onNodeWithText("Next")
            .performClick()

        // Step 2: Visit Purpose
        composeTestRule
            .onNodeWithText("Meeting")
            .assertIsDisplayed()
            .performClick()

        composeTestRule
            .onNodeWithText("Next")
            .performClick()

        // Step 3: Visitor Details
        composeTestRule
            .onNodeWithText("First Name")
            .performTextInput("John")

        composeTestRule
            .onNodeWithText("Last Name")
            .performTextInput("Doe")

        composeTestRule
            .onNodeWithText("Email")
            .performTextInput("john.doe@example.com")

        composeTestRule
            .onNodeWithText("Company")
            .performTextInput("Test Corp")

        composeTestRule
            .onNodeWithText("Next")
            .performClick()

        // Step 4: Host Selection
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            composeTestRule
                .onAllNodesWithText("Jane Smith")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule
            .onNodeWithText("Jane Smith")
            .performClick()

        composeTestRule
            .onNodeWithText("Next")
            .performClick()

        // Step 5: Photo Capture (skip for test)
        composeTestRule
            .onNodeWithText("Skip Photo")
            .performClick()

        // Step 6: Review and Submit
        composeTestRule
            .onNodeWithText("Submit")
            .performClick()

        // Verify submission was called
        coVerify { mockRepository.submitVisit(any()) }

        // Verify success callback
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            onCompleteCallback != null
        }

        assert(onCompleteCallback?.firstName == "John")
        assert(onCompleteCallback?.lastName == "Doe")
        assert(onCompleteCallback?.email == "john.doe@example.com")
    }

    @Test
    fun checkInFlow_backNavigation() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    repository = mockRepository,
                    onComplete = { visit -> onCompleteCallback = visit },
                    onCancel = { onCancelCallback = true }
                )
            }
        }

        // Navigate forward through steps
        composeTestRule.onNodeWithText("English").performClick()
        composeTestRule.onNodeWithText("Next").performClick()
        
        composeTestRule.onNodeWithText("Meeting").performClick()
        composeTestRule.onNodeWithText("Next").performClick()

        // Now navigate back
        composeTestRule
            .onNodeWithText("Back")
            .performClick()

        // Should be back at purpose selection
        composeTestRule
            .onNodeWithText("What's the purpose of your visit?")
            .assertIsDisplayed()

        // Navigate back again
        composeTestRule
            .onNodeWithText("Back")
            .performClick()

        // Should be back at language selection
        composeTestRule
            .onNodeWithText("Select Your Language")
            .assertIsDisplayed()
    }

    @Test
    fun checkInFlow_formValidation() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    repository = mockRepository,
                    onComplete = { visit -> onCompleteCallback = visit },
                    onCancel = { onCancelCallback = true }
                )
            }
        }

        // Navigate to visitor details
        composeTestRule.onNodeWithText("English").performClick()
        composeTestRule.onNodeWithText("Next").performClick()
        composeTestRule.onNodeWithText("Meeting").performClick()
        composeTestRule.onNodeWithText("Next").performClick()

        // Try to proceed without filling required fields
        composeTestRule
            .onNodeWithText("Next")
            .assertIsNotEnabled()

        // Fill only first name
        composeTestRule
            .onNodeWithText("First Name")
            .performTextInput("John")

        // Next should still be disabled
        composeTestRule
            .onNodeWithText("Next")
            .assertIsNotEnabled()

        // Fill last name
        composeTestRule
            .onNodeWithText("Last Name")
            .performTextInput("Doe")

        // Now Next should be enabled
        composeTestRule
            .onNodeWithText("Next")
            .assertIsEnabled()
    }

    @Test
    fun checkInFlow_submissionFailure_showsRetry() {
        // Mock failed submission
        coEvery { mockRepository.submitVisit(any()) } returns Result.failure(
            Exception("Network error")
        )

        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    repository = mockRepository,
                    onComplete = { visit -> onCompleteCallback = visit },
                    onCancel = { onCancelCallback = true }
                )
            }
        }

        // Complete the flow
        completeCheckInFlow()

        // Submit
        composeTestRule
            .onNodeWithText("Submit")
            .performClick()

        // Should show error dialog
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            composeTestRule
                .onAllNodesWithText("Check-in Failed")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule
            .onNodeWithText("Check-in Failed")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Network error")
            .assertIsDisplayed()

        // Should have retry and cancel options
        composeTestRule
            .onNodeWithText("Retry")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Cancel")
            .assertIsDisplayed()
    }

    @Test
    fun checkInFlow_offlineMode_queuesVisit() {
        // Mock offline submission (queues locally)
        coEvery { mockRepository.submitVisit(any()) } returns Result.failure(
            Exception("No network connection")
        )
        coEvery { mockRepository.queueVisitOffline(any()) } returns Result.success(Unit)

        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    repository = mockRepository,
                    onComplete = { visit -> onCompleteCallback = visit },
                    onCancel = { onCancelCallback = true }
                )
            }
        }

        // Complete the flow and submit
        completeCheckInFlow()
        composeTestRule.onNodeWithText("Submit").performClick()

        // Should show offline success message
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            composeTestRule
                .onAllNodesWithText("Queued for Sync")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Verify offline queuing was called
        coVerify { mockRepository.queueVisitOffline(any()) }
    }

    @Test
    fun checkInFlow_progressIndicator() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    repository = mockRepository,
                    onComplete = { visit -> onCompleteCallback = visit },
                    onCancel = { onCancelCallback = true }
                )
            }
        }

        // Should show progress indicator
        composeTestRule
            .onNodeWithContentDescription("Step 1 of 6")
            .assertIsDisplayed()

        // Navigate to next step
        composeTestRule.onNodeWithText("English").performClick()
        composeTestRule.onNodeWithText("Next").performClick()

        // Progress should update
        composeTestRule
            .onNodeWithContentDescription("Step 2 of 6")
            .assertIsDisplayed()
    }

    @Test
    fun checkInFlow_cancellation() {
        composeTestRule.setContent {
            VMSKioskTheme {
                CheckInFlowScreen(
                    repository = mockRepository,
                    onComplete = { visit -> onCompleteCallback = visit },
                    onCancel = { onCancelCallback = true }
                )
            }
        }

        // Cancel from any step
        composeTestRule
            .onNodeWithContentDescription("Cancel")
            .performClick()

        // Should show confirmation dialog
        composeTestRule
            .onNodeWithText("Cancel Check-in?")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithText("Yes, Cancel")
            .performClick()

        // Verify cancel callback
        assert(onCancelCallback)
    }

    private fun completeCheckInFlow() {
        // Language
        composeTestRule.onNodeWithText("English").performClick()
        composeTestRule.onNodeWithText("Next").performClick()

        // Purpose
        composeTestRule.onNodeWithText("Meeting").performClick()
        composeTestRule.onNodeWithText("Next").performClick()

        // Details
        composeTestRule.onNodeWithText("First Name").performTextInput("John")
        composeTestRule.onNodeWithText("Last Name").performTextInput("Doe")
        composeTestRule.onNodeWithText("Email").performTextInput("john.doe@example.com")
        composeTestRule.onNodeWithText("Company").performTextInput("Test Corp")
        composeTestRule.onNodeWithText("Next").performClick()

        // Host
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            composeTestRule.onAllNodesWithText("Jane Smith").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Jane Smith").performClick()
        composeTestRule.onNodeWithText("Next").performClick()

        // Photo (skip)
        composeTestRule.onNodeWithText("Skip Photo").performClick()
    }
}