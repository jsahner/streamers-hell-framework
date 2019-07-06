package com.example.jsahner.sh_vibrate

data class ClientInitialized(val modifications: Collection<String>) {
    val type = "Client.Initialized"
}

data class ClientRegisterModification(val description: String, val name: String)

data class ClientRegister(val modifications: Collection<ClientRegisterModification>?) {
    val type = "Client.Register"
    val id = "Vibrate"
}

data class ExecutionStarted(val modificationId: String) {
    val type = "Execution.Started"
}

data class ExecutionStopped(val modifications: Collection<String>) {
    val type = "Execution.Stopped"
}

data class ExecutionStartRequest(val modificationId: String) {
    val type = "Execution.StartRequest"
}

data class ExecutionStopRequest(val modifications: Collection<String>?) {
    val type = "Execution.StopRequest"
}