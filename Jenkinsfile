pipeline {
    agent any
    tools {
        nodejs "NodeJS18"
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
            post {
                success { echo "Dependencies installed successfully" }
                failure  { echo "Dependency installation failed" }
            }
        }
        stage("Build Angular") {
            steps {
                bat "npm run build -- --configuration production"
            }
            post {
                success { echo "Angular build successful" }
                failure  { echo "Angular build failed" }
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
                                    sourceFiles: "dist/revconnect-angular/browser/**/*",
                                    removePrefix: "dist/revconnect-angular/browser",
                                    remoteDirectory: "angular-build",
                                    flatten: false,
                                    execCommand: '''
                                        echo "Cleaning old nginx files..."
                                        sudo rm -rf /usr/share/nginx/html/*
                                        echo "Copying new Angular build..."
                                        sudo cp -r /home/ec2-user/angular-build/* /usr/share/nginx/html/
                                        echo "Setting permissions..."
                                        sudo chmod -R 755 /usr/share/nginx/html/
                                        echo "Restarting nginx..."
                                        sudo systemctl restart nginx
                                        echo "Deploy completed successfully"
                                        exit 0
                                    '''
                                )
                            ]
                        )
                    ]
                )
            }
            post {
                success { echo "Frontend deployed successfully" }
                failure  { echo "Frontend deployment failed" }
            }
        }
    }
    post {
        always {
            echo "Frontend pipeline finished — build #${BUILD_NUMBER}"
        }
    }
}
