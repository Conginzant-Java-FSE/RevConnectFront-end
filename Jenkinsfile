pipeline {
    agent any

    tools {
        nodejs "Node18"
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
                            configName: "frontend-ec2",
                            transfers: [
                                sshTransfer(
                                    sourceFiles: "dist/**",
                                    removePrefix: "dist",
                                    remoteDirectory: "/home/ec2-user/angular-build",
                                    execCommand: """
                                    echo "Cleaning old nginx files..."
                                    sudo rm -rf /usr/share/nginx/html/*

                                    echo "Copying new Angular build..."
                                    sudo cp -r /home/ec2-user/angular-build/* /usr/share/nginx/html/

                                    echo "Restarting nginx..."
                                    sudo systemctl restart nginx
                                    """
                                )
                            ]
                        )
                    ]
                )
            }
        }
    }
}
