pipeline {
    agent any

    tools {
        nodejs "NodeJS18"
    }

    environment {
        BUILD_DIR = "dist/revconnect-angular/browser"
        REMOTE_DIR = "/usr/share/nginx/html"
    }

    stages {

        stage("Checkout") {
            steps {
                checkout scm
            }
        }

        stage("Install Dependencies") {
            steps {
                bat "npm install"
            }
        }

        stage("Build Angular") {
            steps {
                bat "npm run build -- --configuration production"
            }
        }

        stage("Deploy to Frontend EC2") {
            steps {
                sshPublisher(
                    publishers: [
                        sshPublisherDesc(
                            configName: "frontend-server",
                            verbose: true,
                            transfers: [
                                sshTransfer(
                                    sourceFiles: "dist/revconnect-angular/browser/**",
                                    removePrefix: "dist/revconnect-angular/browser",
                                    remoteDirectory: "/usr/share/nginx/html",
                                    execCommand: "sudo systemctl restart nginx"
                                )
                            ]
                        )
                    ]
                )
            }
        }

    }

    post {
        success {
            echo "Frontend deployed successfully"
        }
        failure {
            echo "Frontend deployment failed"
        }
    }
}
