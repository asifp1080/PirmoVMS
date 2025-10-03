package com.vms.kiosk.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.vms.kiosk.data.model.KioskConfig
import com.vms.kiosk.data.repository.KioskRepository
import com.vms.kiosk.ui.components.*
import com.vms.kiosk.ui.viewmodel.OnboardingViewModel
import kotlinx.coroutines.delay

@Composable
fun OnboardingScreen(
    repository: KioskRepository,
    onComplete: (KioskConfig) -> Unit,
    viewModel: OnboardingViewModel = viewModel { OnboardingViewModel(repository) }
) {
    val uiState by viewModel.uiState.collectAsState()

    // Handle onboarding completion
    LaunchedEffect(uiState.config) {
        uiState.config?.let { config ->
            delay(1000) // Show success briefly
            onComplete(config)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        when (uiState.currentStep) {
            OnboardingStep.WELCOME -> WelcomeStep(
                onNext = viewModel::nextStep
            )
            OnboardingStep.QR_SCAN -> QRScanStep(
                onQRScanned = viewModel::processQRCode,
                onManualSetup = viewModel::startManualSetup,
                isProcessing = uiState.isProcessing
            )
            OnboardingStep.MANUAL_SETUP -> ManualSetupStep(
                serverUrl = uiState.serverUrl,
                deviceId = uiState.deviceId,
                locationId = uiState.locationId,
                onServerUrlChanged = viewModel::updateServerUrl,
                onDeviceIdChanged = viewModel::updateDeviceId,
                onLocationIdChanged = viewModel::updateLocationId,
                onComplete = viewModel::completeManualSetup,
                isProcessing = uiState.isProcessing
            )
            OnboardingStep.DOWNLOADING -> DownloadingStep(
                progress = uiState.downloadProgress,
                message = uiState.downloadMessage
            )
            OnboardingStep.SUCCESS -> SuccessStep(
                config = uiState.config,
                onContinue = { uiState.config?.let { onComplete(it) } }
            )
        }
    }

    // Error Dialog
    ErrorDialog(
        title = "Setup Failed",
        message = uiState.errorMessage ?: "An unexpected error occurred during setup",
        onRetry = {
            viewModel.clearError()
            when (uiState.currentStep) {
                OnboardingStep.QR_SCAN -> viewModel.retryQRProcessing()
                OnboardingStep.MANUAL_SETUP -> viewModel.completeManualSetup()
                else -> {}
            }
        },
        onCancel = viewModel::clearError,
        isVisible = uiState.errorMessage != null
    )

    // Loading Dialog
    LoadingDialog(
        message = uiState.loadingMessage ?: "Setting up your kiosk...",
        isVisible = uiState.isProcessing && uiState.currentStep != OnboardingStep.DOWNLOADING
    )
}

@Composable
private fun WelcomeStep(
    onNext: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Welcome to VMS Kiosk",
            style = MaterialTheme.typography.displayMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Let's set up your visitor check-in kiosk",
            style = MaterialTheme.typography.headlineSmall,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(48.dp))

        Button(
            onClick = onNext,
            modifier = Modifier
                .fillMaxWidth(0.6f)
                .height(56.dp)
        ) {
            Text(
                text = "Get Started",
                style = MaterialTheme.typography.titleMedium
            )
        }
    }
}

@Composable
private fun QRScanStep(
    onQRScanned: (String) -> Unit,
    onManualSetup: () -> Unit,
    isProcessing: Boolean
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Scan Setup QR Code",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Scan the QR code from your VMS admin panel to automatically configure this kiosk",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(48.dp))

        // QR Scanner placeholder
        Card(
            modifier = Modifier
                .size(300.dp)
                .clickable(enabled = !isProcessing) { 
                    // Simulate QR scan
                    onQRScanned("mock_qr_data")
                },
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                if (isProcessing) {
                    CircularProgressIndicator()
                } else {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = "QR Scanner",
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Tap to simulate QR scan",
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        OutlinedButton(
            onClick = onManualSetup,
            enabled = !isProcessing,
            modifier = Modifier.fillMaxWidth(0.6f)
        ) {
            Text("Manual Setup Instead")
        }
    }
}

@Composable
private fun ManualSetupStep(
    serverUrl: String,
    deviceId: String,
    locationId: String,
    onServerUrlChanged: (String) -> Unit,
    onDeviceIdChanged: (String) -> Unit,
    onLocationIdChanged: (String) -> Unit,
    onComplete: () -> Unit,
    isProcessing: Boolean
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(48.dp)
    ) {
        Text(
            text = "Manual Setup",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(48.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.weight(1f)
        ) {
            item {
                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = onServerUrlChanged,
                    label = { Text("Server URL") },
                    placeholder = { Text("https://api.vms.example.com") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isProcessing
                )
            }

            item {
                OutlinedTextField(
                    value = deviceId,
                    onValueChange = onDeviceIdChanged,
                    label = { Text("Device ID") },
                    placeholder = { Text("kiosk-001") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isProcessing
                )
            }

            item {
                OutlinedTextField(
                    value = locationId,
                    onValueChange = onLocationIdChanged,
                    label = { Text("Location ID") },
                    placeholder = { Text("main-office") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isProcessing
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onComplete,
            enabled = !isProcessing && 
                     serverUrl.isNotBlank() && 
                     deviceId.isNotBlank() && 
                     locationId.isNotBlank(),
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isProcessing) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text("Complete Setup")
            }
        }
    }
}

@Composable
private fun DownloadingStep(
    progress: Float,
    message: String
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Setting Up Kiosk",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(48.dp))

        LinearProgressIndicator(
            progress = progress,
            modifier = Modifier
                .fillMaxWidth(0.8f)
                .height(8.dp)
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "${(progress * 100).toInt()}%",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun SuccessStep(
    config: KioskConfig?,
    onContinue: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = "Success",
            modifier = Modifier.size(96.dp),
            tint = Color(0xFF4CAF50)
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Setup Complete!",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Your kiosk is now ready to accept visitors",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        config?.let {
            Spacer(modifier = Modifier.height(32.dp))

            Card(
                modifier = Modifier.fillMaxWidth(0.8f),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(
                    modifier = Modifier.padding(24.dp)
                ) {
                    Text(
                        text = "Configuration",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    ConfigItem("Device ID", it.deviceId)
                    ConfigItem("Location", it.locationName)
                    ConfigItem("Organization", it.organizationName)
                }
            }
        }

        Spacer(modifier = Modifier.height(48.dp))

        Button(
            onClick = onContinue,
            modifier = Modifier
                .fillMaxWidth(0.6f)
                .height(56.dp)
        ) {
            Text(
                text = "Start Kiosk",
                style = MaterialTheme.typography.titleMedium
            )
        }
    }
}

@Composable
private fun ConfigItem(
    label: String,
    value: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

enum class OnboardingStep {
    WELCOME,
    QR_SCAN,
    MANUAL_SETUP,
    DOWNLOADING,
    SUCCESS
}