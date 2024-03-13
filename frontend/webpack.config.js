const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { EnvironmentPlugin } = require('webpack');

module.exports = {
    entry: './src/index.tsx',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js',
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ["@babel/preset-env", "@babel/preset-react"]
                    }
                },
            }, {
                test: /\.scss$/,
                use: [
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            modules: {
                                localIdentName: '[name]__[local]'
                            }
                        }
                    },
                    "sass-loader"
                ]
            }, {
                test: /\.(ts|tsx)$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }, {
                test: /\.(png|jpe?g|gif|ttf|svg)$/i,
                type: "asset/resource"
            }, {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: "asset/resource"
            }
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html'
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'public' }
            ]
        }),
        new EnvironmentPlugin([
            'API_URL',
            'VK_APP_ID',
            'FRONTEND_BASE_PATH'
        ])
    ],
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@public': path.resolve(__dirname, 'public'),
        },
    },
    devServer: {
        host: '0.0.0.0',
        historyApiFallback: true,
        port: 3000,
        static: {
            directory: path.join(__dirname, 'public'),
            publicPath: process.env['FRONTEND_BASE_PATH'],
        }
    },
};